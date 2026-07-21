---
title: Log 09. Lane Model 양자화
date: 2026-05-14
draft: false
---

## 들어가며

[[Log 08_임베디드 환경에서의 병목 진단|지난 포스팅]]에서 확인했듯, 병목은 FP32 모델 추론이다. Thread 수를 조정하는 것만으로는 latency와 시스템 여유를 같이 확보하기 어려웠고, 앞으로 표지판과 신호등 인식까지 이 보드에서 돌려야 하니 모델 계산량 자체를 줄여야 한다.

그래서 이번엔 양자화를 본격적으로 적용해 본다.

---

## 1. FP32를 INT8로 바꾸면 끝일까

> **Quantization**: FP32로 표현하던 연산과 값을 더 낮은 정밀도로 바꾸어 모델 크기와 계산량을 줄이는 방법

먼저 학습이 끝난 ONNX 모델을 곧바로 INT8로 변환하는 **static PTQ**(Post-Training Quantization)를 적용해 봤다. 약 44MB이던 모델이 11MB대로 줄었다.

속도는 나아졌지만 출력은 당연히 그대로 유지되지 않았다.
CLRKDNet의 raw output은 confidence 기준과 겹치는 후보를 제거하는 NMS, 좌표 복원을 거쳐 lane polyline이 된다. 값이 양자화로 인해 조금만 달라져도 threshold를 넘나들면 lane 수나 위치가 달라지고, 뒤쪽의 조향 mode까지 바뀔 수 있다.

| Full PTQ에서 얻은 것       | 함께 나타난 문제               |
| --------------------- | ----------------------- |
| 모델 크기와 추론 시간 감소       | Lane candidate 수와 위치 변화 |
| 별도 학습 없는 간단한 변환       | Decoder mode와 조향값 불일치   |
| Pi에서 실행할 수 있는 INT8 모델 | 기존의 엄격한 의미 보존 기준은 모두 실패 |

그래서 모델 전체를 한 번에 줄이는 대신, **어느 부분까지 양자화해야 주행에 필요한 의미가 유지되는지**를 다시 탐색했다.

---

## 2. PTQ 범위 조정과 QAT 검토

### 2.1. Head를 남긴 Selective PTQ

Full PTQ에서 생긴 출력 변화를 줄이려면, 어느 부분을 FP32로 남길지부터 정해야 했다.

CLRKDNet을 크게 나누면 다음과 같은 구조다:

```text
Backbone  →  Neck  →  Head
특징 추출    특징 결합   confidence·lane geometry 출력
```

이 중 Head는 decoder가 사용할 confidence와 lane 좌표를 직접 만든다. 앞쪽 feature의 작은 변화보다 Head의 출력 변화가 lane 후보의 생성과 제거에 바로 영향을 줄 수 있다고 보고, 우선 이 부분을 FP32로 보호해보기로 했다.

그래서 모델 전체를 양자화하는 대신 **Head는 FP32로 남기고 Backbone과 Neck의 양자화 범위를 조정하는 Selective PTQ**를 적용했다.

- Backbone 후반부만 INT8로 변환
- Backbone 전체를 INT8로 변환
- Backbone과 Neck까지 INT8로 변환
- 모든 후보에서 Head는 FP32로 유지

양자화 범위를 좁히면 FP32의 출력을 더 비슷하게 유지할 수 있지만 속도 이득도 줄어들었다.
반대로 범위를 넓힐수록 빨라졌지만 출력 차이가 커졌다.

### 2.2. CLRKDNet의 KD 구조와 QAT 구현 범위

Selective PTQ가 민감한 부분을 양자화 대상에서 빼는 방법이라면, **QAT**(Quantization-Aware Training)는 모델이 학습 중에 양자화 오차를 미리 경험하도록 만드는 방법이다. 양자화 범위를 넓히면서도 출력 변화를 줄이려면 QAT가 더 근본적인 방법으로 보였다.

근데 CLRKDNet의 원래 학습 구조까지 함께 가져가려니 QAT 구현 범위가 생각보다 훨씬 커졌다.

QAT 자체에 teacher model이 반드시 필요한 것은 아니지만, 내가 사용한 CLRKDNet의 [공식 학습 방식](https://github.com/weiqingq/CLRKDNet)은 무거운 CLRNet teacher가 attention, lane prior와 logit을 전달하고, 가벼운 student가 이를 따라 배우는 Knowledge Distillation 구조다.

이러한 원래 학습 구조까지 유지한 채 QAT를 구성하려면 다음 작업이 추가로 필요했다:

- 프로젝트의 Local Fit 레이블로 CLRNet teacher부터 다시 학습한다.
- Teacher config와 checkpoint가 맞는지 확인한다.
- Attention·prior·logit distillation loss와 fake quantization을 함께 연결한다.
- 학습한 student를 ONNX로 변환하고 Pi 배포까지 다시 검증한다.

현재 student는 CULane의 전체 lane geometry가 아니라 [[Log 06_Local Fit 기반 학습 목표 재구성|Local Fit]]을 예측하도록 학습되어 있다. 기존 CULane teacher를 그대로 사용해도 현재 task에 맞는 지식을 줄 수 있는지도 확실하지 않았다.

결국 몇 epoch를 더 학습하는 것보다 teacher 준비부터 학습 코드 수정, ONNX 변환과 디버깅까지 이어지는 전체 범위가 문제였다. 심지어 프로젝트 자체도 기간이 많이 남지 않았고, 아직까지 레인 모델만 작업하고 있어서 이 경로를 새로 구현하고 검증하기에는 시간이 부족했다.

### 2.3. QAT-lite로 범위를 줄인 실험

그래서 정식 KD+QAT를 재현하는 대신, 이미 Local Fit으로 학습한 student가 양자화 오차만 짧게 경험하도록 실험 범위를 줄였다.

```text
Local Fit FP32 checkpoint
→ 선택한 연산에 fake quantization 적용
→ 2 epoch supervised fine-tuning
→ FP32 ONNX export
→ ONNX Runtime static INT8 변환
```

Fake quantization은 실제 값을 INT8로 저장하지는 않지만, 학습 과정에서 양자화했을 때 생길 반올림과 표현 범위의 오차를 흉내 낸다.

이 QAT는 다음과 같이 양자화 대상 범위를 설정했다:
- Backbone 전체
- Backbone + Neck
- Layer 4
- Total model

참고로 저 layer4는 임의로 고른 것은 당연히 아니다.
layer4는 ResNet-18 Backbone의 마지막 feature 추출 구간인데, 앞선 Selective PTQ에서 이 부분만 양자화한 후보가 가장 좋은 결과를 보였었다. 그래서 QAT 양자화 대상에 저 Layer 4도 포함시켰다.

다만 이렇게 만든 QAT-lite 후보들도 lane 수와 주행 mode, 조향값이 FP32와 거의 완전히 같아야 한다는 기존 기준은 통과하지 못했다. PTQ 범위를 조정하거나 학습 중 양자화 오차를 보여주는 것만으로는 모든 차이를 없앨 수 없었다.

그래도 이게 수치적으로 드러나는 양자화의 정확도 하락이 정말 실주행에서도 주행을 못할 정도로 성능이 떨어지는지는 확인할 필요가 있었다. 어차피 이 양자화를 하는 이유도 이전에 모델 추론이 너무 무거웠던 병목인 거고, 지금 그 양자화 후보를 PTQ부터 Selective PTQ, QAT-Lite까지 많이 확보해 놓았다.

여기서 더 양자화를 퀄리티 좋도록 실험하는 건 실용적이지 못하다고 판단해서 양자화는 이정도에서 마무리했다.

---

## 3. 양자화 후보의 조향 결과 비교

### 3.1. 완전 일치보다 위험한 차이

이제 실주행 후보를 추리기 위한 최소한의 확인을 했다.

앞에서 양자화를 하며 체크한 성능 기준은 raw output뿐 아니라 decoder가 만든 lane 수와 mode, 최종 조향값까지 FP32와 거의 완전히 같은지를 확인했다. 변환 전후의 동작이 그대로 유지되는지 보기에는 안전한 기준이지만, frame 하나에서 lane 수나 mode가 한 번만 달라져도 후보 전체가 탈락할 만큼 엄격했다.

이제 확인하려는 것은 FP32를 그대로 복제했는지가 아니라, **그 차이가 실제 조향에서 위험한 결과로 이어지는지**였다.

자동차가 실제로 사용하는 값은 다음 과정을 거쳐 만들어진다:

```text
Raw output
→ confidence filtering·NMS
→ lane polyline
→ Local Tangent
→ EWA 후처리
→ steer_norm
```

이 경로에서 FP32와 작은 차이가 생기는 것과 조향 방향이 반대로 바뀌는 것은 위험도가 다르다. 한 frame에서 heading이 조금 달라도 다음 frame에서 다시 수정할 수 있지만, 좌우 판단이 뒤집히거나 lane을 연속으로 놓치면 실제 이탈로 이어질 수 있다.

그래서 이번에는 모든 차이를 실패로 처리하는 대신, 현장에 가져가기 전에 위험한 후보를 먼저 걸러내는 기준을 잡았다.

- 강한 조향과 heading의 좌우 방향이 반대로 바뀌는가
- 양쪽·한쪽·소실 같은 주행 mode가 지나치게 자주 달라지는가
- 한쪽 lane을 갑자기 놓치거나 새로운 lane을 만들어내는가
- Center, heading과 `steer_norm`의 차이가 얼마나 큰가

### 3.2. 실주행 기록으로 후보 줄이기

이 확인에는 이전 현장 주행 기록을 사용했다. 약 7 frame 간격으로 240장을 뽑고, 시간 순서를 유지한 채 FP32와 각 양자화 후보를 replay했다. 모든 후보에는 같은 decoder와 Local Tangent·EWA 후처리를 적용했다.

이건 실제 자동차를 굴린 실주행 테스트는 아니다. 같은 주행 sequence에서 최종 조향 판단까지 비교해, Pi와 현장에 가져갈 후보를 미리 줄이는 Offline test다.

전체 후보를 비교한 뒤에는 다음 두 모델을 대표 후보로 남겼다.

- **Balanced PTQ:** Backbone과 Neck을 양자화하고 Head는 FP32로 남긴 Selective PTQ 후보
- **Fast QAT-lite:** `layer4`에 fake quantization을 적용해 적응시킨 뒤 static INT8로 변환한 후보

![[embedded_ai_car_log09_behavior_compare.png]]

> 위의 대표 장면에서는 세 후보가 모두 두 lane을 안정적으로 찾았다. 아래의 위험 장면에서는 fast QAT-lite가 한 lane만 남기며 `lost_short_recovery`로 바뀐 반면, balanced PTQ는 FP32와 같은 `single_left` mode를 유지했다.

대표적인 두 후보의 결과는 다음과 같았다.

| 후보 | 강한 steer / heading 방향 반전 | Mode 불일치 | Heading 차이 p95 | 후보의 역할 |
|---|---:|---:|---:|---|
| Balanced PTQ | 0 / 0 | 3 / 240 | 0.075 | 주행 판단 보존 우선 |
| Fast QAT-lite | 0 / 0 | 11 / 240 | 0.223 | 속도 확인 후보 |

`p95`는 frame별 차이를 작은 순서로 놓았을 때 95% 지점의 값이다. 극단적인 한두 frame보다 주행 sequence 전반에서 차이가 어느 정도까지 커지는지를 보기 위해 사용했다.

Balanced PTQ는 대부분의 frame에서 FP32의 주행 mode를 유지했고, heading 차이도 임시로 둔 `0.20` 기준 안에 들어왔다. 반면 fast QAT-lite는 mode가 달라진 frame이 더 많았고, heading 차이도 `0.223`으로 기준을 조금 넘었다.

그래도 fast 후보에서 강한 조향과 heading의 방향이 반대로 뒤집힌 경우는 없었다. 완전히 망가진 모델이라기보다는, 속도 이득과 함께 실제 주행에서 한 번 더 확인해 볼 후보에 가까웠다.

그래서 FP32의 행동을 더 비슷하게 보존한 balanced 후보와, 출력 차이는 더 있지만 속도 이득을 현장에서 확인해 볼 fast 후보를 함께 다음 단계로 넘겼다.

---

## 4. Pi 속도와 현장 주행

### 4.1. Raspberry Pi 추론 속도

Offline replay로 현장에 가져갈 후보는 줄였지만, 처음의 병목이 실제 Pi에서 얼마나 줄었는지는 따로 확인해야 했다.

각 양자화 후보에 같은 500장의 이미지를 넣어 순수 ONNX inference 시간을 측정했다. 한 후보의 실행이 끝나면 결과를 회수하고 Pi를 재부팅한 뒤 다음 후보를 실행했다.

![[embedded_ai_car_log09_pi_latency.png]]

> Raspberry Pi에서 3 threads로 측정한 model-only inference latency. 카메라, decoder, 조향 후처리와 모터 시간은 포함하지 않는다. FP32는 앞선 runtime 진단의 live frame, 양자화 후보는 저장된 500장으로 측정했으므로 동일 입력의 정밀한 A/B보다는 장치 위 속도 규모를 비교하는 기준으로 사용했다.

| 후보 | 평균 inference | Model-only FPS | FP32 대비 |
|---|---:|---:|---:|
| FP32 | 375.9ms | 2.66fps | 1.0배 |
| Balanced PTQ | 135.2ms | 7.40fps | 2.78배 |
| Fast QAT-lite | 86.9ms | 11.51fps | 4.33배 |

Balanced PTQ도 FP32보다 약 2.8배 빨라졌고, fast QAT-lite는 한 번의 추론을 100ms 안쪽으로 줄였다.

Thread 수에 따른 차이도 함께 확인했다.

- **2 threads:** balanced 약 162ms, fast 약 111ms, CPU 사용률 약 50%
- **3 threads:** balanced 약 135ms, fast 약 87ms, CPU 사용률 약 75%

Lane model만 최대한 빠르게 실행한다면 3 threads가 유리하지만, 앞으로 표지판과 신호등 인식도 같은 Pi에서 실행해야 한다. 모델 선택과 함께 다른 모듈이 사용할 CPU 여유도 고려해야 했다.

양자화 이후에도 연속으로 실행하면 일부 조건에서 온도가 80°C 중반까지 올라갔다. 양자화가 발열과 전원 문제까지 해결해 준 것은 아니었다. 그래도 추론 시간이 크게 줄면서 thread 수나 실행 주기를 조정해 다른 작업이 들어갈 여지를 만들 수 있었다.

### 4.2. 현장에서 달라진 우선순위

Offline 결과만 보면 balanced PTQ를 선택하는 것이 가장 안전했고, Pi 속도만 보면 fast QAT-lite가 가장 유리했다. 근데 자동차는 한 장의 이미지를 한 번 처리하고 끝나는 것이 아니라, 다음 frame을 다시 보고 계속 조향을 수정한다. 결국 둘 중 무엇이 실제 주행에 더 중요한지는 직접 굴려봐야 했다.

그래서 현장에는 FP32와 balanced PTQ, fast QAT-lite를 모두 가져가 같은 주행 코드에서 모델만 짧게 바꾸어 확인했다.

결과적으로, Offline 지표에서 보였던 차이만큼 주행 성능이 크게 달라지는 느낌은 아니었다.
오히려 체감된 차이는 **한 frame의 lane을 FP32와 얼마나 똑같이 그리는가보다 다음 장면을 얼마나 빨리 다시 보고 조향을 수정하는가**에 가까웠다.

Fast 후보는 frame 하나만 보면 heading이나 mode가 조금 더 자주 달라졌다. 그래도 추론이 빠르면 다음 frame에서 새로운 조향값을 더 일찍 계산할 수 있고, EWA 후처리도 frame 단위의 작은 흔들림은 어느 정도 완화해 준다. 물론 한쪽으로 계속 치우치거나 lane 자체를 놓치는 문제까지 속도와 후처리로 해결되는 것은 아니다.

그래서 하나의 모델을 주행 코드에 고정하지 않고 세 가지 역할로 나누었다.

- **FP32:** 출력과 조향 행동을 비교하기 위한 기준선
- **Balanced PTQ:** FP32의 주행 행동 보존을 우선한 후보
- **Fast QAT-lite:** 빠른 조향 갱신 주기를 우선한 후보

모델 경로와 ONNX Runtime thread 수를 config로 분리해, 같은 주행 코드에서 세 후보를 교체할 수 있도록 남겼다.

---

## 마치며

양자화를 하며 느낀 건, 일단 적어도 이 Pi 임베디드 환경에선 속도의 이득이 정말 체감되었다. 계속 Low voltage 발생하고, 연결 끊기고, 주행 성능 하락하는 등의 문제가 양자화 하나로 눈에 띄게 좋아졌다.

그리고 이건 사실 이 프로젝트에 한해서 느낀 점이겠지만, 정확도가 수치적으로 하락한다고 하더라도 실주행을 해보기 전까지는 알 수 없었다. 수치적으로만 Gate를 구성해서 양자화를 진행했을 때 당연히 성능이 안나올 거라고 예상했던 후보들이 막상 주행할 땐 그렇게 체감되지 않았다.
근데 이게 몇몇 프레임에서 성능이 떨어진다고 하더라도, Pi 자동차는 그 후의 프레임들에서 지속적으로 상태를 갱신할 수 있기 때문에 그렇게 느낀 것 같다.

어찌 되었든, 길고 긴 Lane model 작업은 일단락되었다.
프로젝트 기간의 약 80%를 이 Lane model refine 작업에 쏟은 것 같은데, 정말 힘들었다.
돌이켜보면, 임베디드 환경을 고려하지 않고 딥러닝 모델로 이 자율주행 task를 해결하려고 했던 것이 어느 정도 실패에 가까운 요인이지 않았나 싶다.

아무튼 이제 다른 탐지 모듈들 빠르게 구현해야 한다.