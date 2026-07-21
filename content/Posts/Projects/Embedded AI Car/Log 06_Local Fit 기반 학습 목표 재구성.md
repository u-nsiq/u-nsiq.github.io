---
title: Log 06. Local Fit 기반 학습 목표 재구성
date: 2026-05-10
draft: false
---

## 들어가며

> *"Lane detection 모델을 사용한다고 해서, 화면에 보이는 레인의 전체 geometry를 꼭 복원해야 할까?"*

[[Log 05_Fine-tuning 적용과 한계 분석|이전 실험]]에서는 fine-tuning을 거친 모델이 프로젝트 맵의 노란 선에 반응하기 시작했지만, 곡선과 교차로에서 자동차가 따라갈 하나의 기준을 안정적으로 만들지는 못했다.

그래서 레인 모델이 해야 하는 일 자체를 다시 생각해보며 재정의해봤고, 자동차가 지금 움직이기 위해 필요한 것은 멀리까지 이어진 곡선의 정확한 모양보다, **차량 가까이에 레인이 어디에 있고 어느 방향으로 향하는지**였다.

이번엔 레인 모델이 전체 차선을 더 정교하게 복원하도록 하는 대신, 이 두 정보만 남긴 학습 목표를 만들어보기로 했다.

---

## 1. Local Fit 아이디어


사실 곡선도 아주 짧은 구간만 보면 직선에 가깝게 볼 수 있다.
그렇다면 화면 하단에서 차량과 가까운 레인의 일부만 직선으로 표현해도, 자동차에 필요한 두 정보를 함께 담을 수 있다.

- 직선의 **위치**는 차량 가까이에서 레인이 왼쪽과 오른쪽 어디에 있는지 나타낸다.
- 직선의 **기울기**는 그 레인이 앞쪽으로 어느 방향을 향하는지 나타낸다.

이렇게 얻은 후보가 차량 양쪽에서 안정적으로 하나씩 잡힌다면, 두 선 사이를 주행 corridor로 보고 그 중심을 계산할 수 있다. 한쪽 후보만 보이는 경우에도, 그 선의 위치와 방향에서 일정한 offset을 둔 주행 기준을 만드는 방법을 생각할 수 있었다.

물론 이것은 이 단계에서 세운 가설이었다. 두 후보가 생성됐다고 해서 실제 좌·우 경계가 하나씩 선택됐다는 보장은 없고, 한 후보만으로 주행할 수 있는지도 별도의 조향 규칙과 검증이 필요하다. 여기서는 우선 모델이 **주행에 가까운 형태의 선 후보**를 학습하도록 만드는 데 집중했다.

또 하나 구분해야 할 것은 실제로 관측한 부분과 모델에 가르칠 표현이었다. 방향을 계산할 때 근거로 삼는 것은 노란색 mask가 존재하는 차량 가까운 짧은 구간이다.

근데 이걸 CLRKDNet에 학습시키려면 이 방향을 CULane 좌표 형식에 맞게 더 긴 polyline으로 표현해야 한다. 그래서 카메라에 보이는 이미지 가장 하단에 실질적인 주행 방향 직선을 labeling하고, 그 직선 그대로 쭉 연장해서 레이블을 새로 생성했다. 연장된 부분은 같은 방향을 전달하기 위한 학습 target이지, 멀리 있는 실제 레인을 관측했다는 뜻은 아니다.

이 아이디어를 학습 레이블로 만드는 정책을 **Local Fit**이라고 정했다.
이는 **차량 가까운 방향을 CLRKDNet의 정답 좌표로 만드는 레이블 정책**이다.

![[embedded_ai_car_log06_localfit_idea.png]]

> 전체 곡선을 그대로 복원하는 대신, 차량 가까운 구간의 위치와 방향을 짧은 직선으로 표현한다. 두 선이 실제 양쪽 경계로 안정적으로 잡힐 때는 corridor와 중심을 구성할 수 있고, 한 선만 남는 상황에서는 그 선을 기준으로 offset을 두는 방법을 생각할 수 있다.

---

## 2. 아이디어를 CULane 레이블로 옮기기

아이디어를 실제 학습에 사용하려면 CLRKDNet의 레이블 형식에 맞춰야 했다.
CLRKDNet은 lane을 `x = f(y)` 형태로 표현하고, 원본 이미지의 정해진 `sample_y`마다 x좌표를 학습한다. 학습 데이터의 `.lines.txt`에도 같은 방식의 좌표열이 들어간다.

HSV로 만든 Binary mask는 최종 정답이 아니다. 어느 픽셀이 노란색인지는 알려주지만, 그중 어느 부분을 차량이 따라갈 방향으로 바꿀지는 별도로 정해야 한다.

[[Log 04_Label Pipeline 구축하기|앞에서 만든 Label Pipeline]]은 `mask → lane polyline` 단계가 다른 처리 과정과 분리되어 있었다. 전체 dataset builder를 다시 만드는 대신, 이 부분을 Local Fit 정책으로 교체했다.

```text
원본 이미지와 수집 정보
→ 노란색 mask
→ Local Fit lane polyline
→ CULane dataset
```

### 2.1. Component-local 관측 구간

먼저 노란색 mask를 connected component로 나눠 서로 떨어진 노란 영역을 각각 후보로 다뤘다. 그다음 component 전체를 따라가지 않고, component가 화면에서 가장 아래까지 내려온 지점을 기준으로 위쪽 최대 `120px`만 사용했다.

여기서 `120px`은 이미지 맨 아래에 고정된 crop이 아니다. 화면 중간에서 끝나는 component라면, 그 component의 아래쪽부터 최대 120px이 local 관측 구간이 된다. 이 기준으로 가까이 보이는 노란 선 조각마다 자체적인 관측 범위를 만들 수 있었다.

두꺼운 노란 선의 어느 부분을 대표점으로 사용할지도 정해야 했다. 선의 가운데를 사용하면 원근과 선 두께에 따라 주행 영역과의 거리가 함께 달라질 수 있었다. 그래서 component가 화면 중앙의 왼쪽에 있으면 오른쪽 edge를, 오른쪽에 있으면 왼쪽 edge를 사용했다.

정확한 좌·우 lane을 의미적으로 분류한 것은 아니다. 각 component의 위치를 기준으로 화면 중심을 향한 edge를 고르는 **heuristic**이다. 가장 끝의 픽셀 하나는 작은 mask 노이즈에도 흔들릴 수 있어서, 실제 구현에서는 edge 쪽 quantile을 대표점으로 사용했다.

![[embedded_ai_car_log06_component_local_window.png]]

> 왼쪽은 최종 HSV mask에서 분리한 connected component, 오른쪽은 각 component의 아래쪽 최대 120px와 화면 중심 방향 edge의 대표점을 표시한 결과다. 두 색은 candidate 구분용이며 의미적인 좌·우 lane 분류가 아니다.

### 2.2. 직선 Fit과 `sample_y` 연장

Local 관측 구간의 각 y행에서 대표 x좌표를 뽑고, 다음과 같이 직선을 fitting했다.

$$
x = ay + b
$$

실제 mask가 뒷받침하는 것은 이 짧은 구간뿐이다. 여기서 구한 기울기 `a`를 현재 레인이 향하는 local direction으로 보고, 같은 `a`, `b`를 CULane의 `sample_y` 위치에 대입해 학습용 polyline 좌표를 만들었다.

```text
노란색 component
→ component 아래쪽 local 구간 선택
→ 화면 중심 쪽 edge의 row point 추출
→ x = ay + b fitting
→ sample_y마다 x좌표 계산
→ .lines.txt polyline
```

![[embedded_ai_car_log06_localfit_mechanism.png]]

> 전체 프레임 위에서 실선은 mask가 뒷받침하는 local fit 구간, 점선과 빈 원은 같은 직선을 CULane `sample_y`로 연장한 학습 target이다. 색은 candidate를 구분하기 위한 것으로, 의미적인 좌·우 lane 분류가 아니다.

Local window는 `120`, `160`, `260px`를 비교했고, row 대표점도 `center`, `inner edge`, `outer edge`로 바꿔봤다. 75장의 이미지에서 비교했을 때 후보 간 차이는 결정적이지 않았다. 예를 들어 `inner_edge_w120`과 `inner_edge_w160`은 모두 56장에서 두 line이 생성됐고, line이 하나도 생성되지 않은 경우만 각각 1장과 3장이었다.

최종적으로는 수치만 보고 고르기보다 곡선 overlay를 함께 확인했다. 긴 window는 먼 곡률까지 직선 기울기에 섞이는 경우가 있었고, `inner edge + 120px`은 차량 가까운 방향을 비교적 직접적으로 나타냈다. 그래서 `inner_edge`, `window 120px`, 프레임당 최대 2개의 candidate를 최종 정책으로 사용했다.

---

## 3. Review Queue와 데이터셋 재구축

먼저 정책이 실제 주행 장면에서 지나치게 흔들리거나 자주 비는지 확인하기 위해, 학습에서 분리한 주행 시점 데이터 1,730프레임에 Local Fit을 시간 순서대로 적용했다. 이 검토에서 2개 candidate가 생성된 프레임은 1,384장, 1개는 336장, 0개는 10장이었다.

이 숫자는 CLRKDNet의 추론 성능이 아니라 **자동 레이블 생성 정책의 출력 수**다. 그리고 1개가 나온 장면에는 실제로 한쪽 선만 보이는 경우와 다른 component를 놓친 경우가 함께 들어 있을 수 있었다. 그래서 overlay를 같이 확인했다.

그다음 같은 정책을 **기존 맵 이미지에서 모은 학습 후보 9,375장**에 적용했다. 자동 생성 결과는 다음 세 상태로 나눴다.

- `usable_auto`: 유효한 candidate가 있고 fitting 품질 기준을 통과한 프레임
- `review_needed`: 선은 생성됐지만 fitting 오차가 크거나 line quality가 약한 프레임
- `reject`: 유효한 선을 만들지 못한 프레임

후보 component가 많거나 line이 하나뿐이라는 이유만으로 제외하지는 않았다. 곡선과 교차로에서는 여러 노란 영역이 보일 수 있고, 실제 주행에서도 한쪽 경계만 보이는 경우가 있기 때문이다. 대신 최종 선택된 line의 fitting 오차와 품질이 불안정할 때 review queue로 보냈다.

![[embedded_ai_car_log06_review_queue.png]]

> 같은 자동 생성 과정에서도 바로 사용할 수 있는 레이블과 추가 검토가 필요한 사례가 함께 나왔다. 이번 baseline에서는 `review_needed`를 억지로 포함하지 않고 `usable_auto`만 학습에 사용했다.

| 처리 결과 | 이미지 수 |
|---|---:|
| 전체 후보 | 9,375장 |
| `usable_auto` | 8,616장 |
| `review_needed` | 727장 |
| `reject` | 32장 |
| Train | 6,894장 |
| Validation | 1,722장 |

최종 데이터셋에는 16,674개의 Local Fit polyline이 들어갔다.
Train과 validation은 각 수집 장면 안에서 시간 순서에 따라 8:2로 나눴고, 이미지와 `.lines.txt`, lane mask, list 파일의 누락과 좌표 범위를 다시 검사했다.

이번 데이터셋의 목적은 맵 전체 차선의 정답을 복원하는 것이 아니라, 같은 기준의 near-field direction을 수천 장에 일관되게 제공하는 것이었다.

---

## 4. 새로운 Target으로 Fine-tuning

새 데이터셋으로 CULane pretrained weight에서 다시 fine-tuning을 진행했다. CLRKDNet의 구조와 공식 학습 흐름은 유지하고, 모델에 정답으로 제공하는 lane geometry만 Local Fit 형태로 바꿨다.

![[embedded_ai_car_log06_finetune_curve.png]]

> Local Fit validation 레이블을 기준으로 계산한 내부 metric. `F1@IoU=0.50`은 epoch 1의 0.4897에서 epoch 11의 0.7478까지 상승했다.

이 값은 정답 자체가 달라졌기 때문에, 공식 CULane benchmark나 앞서 만든 전체 geometry 기반 pseudo-label 데이터셋의 수치와 직접 비교할 수 없다.
그래도 같은 Local Fit validation set 안에서 metric이 학습과 함께 상승했고, 새롭게 정의한 target을 CLRKDNet이 학습할 수 있다는 것은 확인할 수 있었다.

여기까지 모델이 내놓는 것은 여전히 여러 lane candidate의 좌표다. 달라진 것은 좌표가 표현하도록 가르친 대상이다. 전체 곡선 대신 **차량 가까운 위치와 방향을 담은 polyline**을 학습 target으로 삼았다.

---

## 마치며

Local Fit 정책을 고안하고 만들면서 가장 오래 고민한 건 직선을 어떻게 fitting할지가 아니라, 어디까지를 정답이라고 부를 것인지였다. 보이는 차선 전체를 그대로 가르치는 대신, 프로젝트가 실제로 필요로 하는 부분만 남겨도 되는지부터 다시 생각했다.

결과적으로, 가져온 모델의 원래 task를 그대로 잘 풀 수 있게 한 것이 아닌, 목적에 맞춰서 레이블 정책을 재정의해보고 모델의 역할을 수정했다.

여기까지는 새 레이블 정책으로 다시 학습한 모델이 **차량 가까운 위치와 방향을 담은 좌표를 출력하는 것**까지 확인했다. 이제 남은 것은 이 좌표에서 주행 기준을 고르고, 자동차가 사용할 실제 조향값으로 바꾸는 일이다.