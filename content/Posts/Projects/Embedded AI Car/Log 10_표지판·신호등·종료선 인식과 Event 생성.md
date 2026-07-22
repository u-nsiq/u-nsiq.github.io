---
title: Log 10. 표지판·신호등·종료선 인식과 Event 생성
date: 2026-05-21
draft: false
---

## 들어가며
이제 표지판과 신호등 인식 모듈들 차례다.

Lane model은 매 frame마다 연속적인 조향값을 내지만, 표지판과 신호등 detector의 출력은 같은 대상이 보이는 동안 여러 frame에 걸쳐 반복된다. 자동차가 같은 명령을 계속 받지 않게 하려면, 반복되는 detection을 한 번의 Event로 정리해야 한다.

이번 단계에서는 표지판·신호등·종료선을 인식하고, 각 detector의 출력을 주행 제어 계층이 받을 수 있는 공통 Event로 만드는 데 집중했다.

---

## 1. 표지판 Dataset과 Bounding Box 레이블

### 1.1. 현장 데이터 구성

프로젝트 맵에는 방향, 정지, 경적과 속도 표지판이 정해진 위치에 설치되어 있었다. 첫 수집 데이터에는 표지판을 정면에서 찍은 이미지가 많았지만, 실제 주행에서는 표지판이 화면 가장자리에서 작게 등장하고 차가 가까워지면서 크기와 각도가 계속 바뀐다.

그래서 추가 현장 수집에서는 자동차를 직접 움직이며 표지판에 접근하는 장면을 연속으로 촬영했다. 이 가운데 2,542장을 [Roboflow](https://roboflow.com/)에 올리고 다음 6개 클래스로 정리했다.

| Class      | 이미지 수 | 주행 의미   |
| ---------- | ----: | ------- |
| `left`     |   477 | 좌회전 표지판 |
| `right`    |   412 | 우회전 표지판 |
| `straight` |   386 | 직진 표지판  |
| `horn`     |   457 | 경적 표지판  |
| `stop`     |   395 | 정지 표지판  |
| `speed_20` |   415 | 감속 표지판  |

각 이미지에는 표지판 본체만 감싸도록 Bounding Box를 그렸다. 기둥과 받침대까지 포함하면 객체의 실제 크기와 가까워지는 시점을 판단하기 어려워지고, 배경의 모양을 클래스 특징으로 학습할 가능성도 커지기 때문이다.

![[embedded_ai_car_log10_roboflow_examples.jpg]]

> Roboflow에서 레이블링 작업한 화면. 왼쪽부터 `right`, `horn`, `straight`.

이 레이블 작업은 정말 마우스로 하는 노가다 작업이긴 했는데, Lane model 레이블 파이프라인 구축하고 정책 수정하고 그랬던 걸 생각하면 정말 편하고 쉬운 작업이었다.

### 1.2. 가벼운 YOLO 후보

이 모듈은 Lane model과 같은 Raspberry Pi에서 돌아가야 했다. 모델을 처음부터 새로 설계하기보다, 경량 pretrained weight와 학습·ONNX 변환 경로가 잘 갖춰진 YOLO 계열을 사용하는 편이 현실적이었다. 그중 가장 작은 n 계열인 YOLO11n을 기준 모델로 두었다.

동일한 데이터로 증강이 없는 후보와 색상·밝기·작은 기하 변형을 적용한 light augmentation 후보를 비교했다.

> 참고로 **Light augmentation**의 경우, Roboflow에서 제공하는 다양한 증강 기법들을 가볍게 적용했고, 데이터 수 자체 증강까지 더한 것이다.

| Dataset            | Test mAP50 | Precision |     Recall |
| ------------------ | ---------: | --------: | ---------: |
| Clean              |     0.9931 |    0.9887 |     0.9786 |
| Light augmentation | **0.9937** |    0.9842 | **0.9945** |

두 후보의 mAP 차이는 크지 않았다. 여기서는 precision이 조금 높은 모델보다 recall이 높은 light augmentation 모델을 선택했다. 일시적인 오검출은 연속 관측 gate에서 일부 억제할 수 있지만, 표지판을 계속 놓치면 해당 명령 자체가 발생하지 않기 때문이다.

근데 0.99에 가까운 mAP를 일반적인 표지판 인식 성능으로 해석하긴 애매한게, train과 test 모두 같은 실내 맵에서 연속으로 촬영한 이미지에 가깝고, 촬영 위치와 배경도 서로 비슷했다.

---

## 2. Detection에서 Event까지

YOLO가 반환하는 것은 class, confidence와 Bounding Box다.
주행 제어 계층에 필요한 것은 한 번만 소비할 수 있는 Event다. 초기 검증에서는 이를 `SIGN_RIGHT`, `SIGN_STOP` 같은 이름으로 기록했고, 두 출력 사이에 별도의 변환 규칙을 두었다.

```text
class · confidence · bounding box
→ 가까움 판단
→ 연속 관측 확인
→ SIGN_* event
→ 동일 class cooldown
```

### 2.1. Event 확정 조건

먼저 confidence 기준을 통과한 box 중에서 크기와 화면 위치를 함께 보았다. 멀리 있는 작은 표지판보다 주행 경로에 가까워진 큰 box를 먼저 선택하고, 충분히 가까워졌을 때만 event 후보로 넘겼다.

한 frame의 detection을 바로 Event로 사용하지도 않았다. 초기 후보에서는 짧은 시간 안에 두 번 이상 관측됐을 때 event를 발생시키고, 한 번 발생한 클래스는 약 2초 동안 다시 발생하지 않도록 cooldown을 두었다.

- **Proximity gate:** box 면적과 위치로 detection을 Event 후보로 넘길 시점을 정한다.
- **Debounce:** 연속 관측으로 한 frame의 순간 오검출을 억제한다.
- **Cooldown:** 같은 표지판이 여러 frame에 걸쳐 보일 때 명령이 반복되는 것을 막는다.

이 구조에서 detector는 관측을 한 번의 Event로 정리하는 데까지만 담당한다. 좌회전을 몇 초 동안 수행할지, 정지 Event를 언제 해제할지 같은 행동은 뒤쪽의 state machine이 결정한다.

### 2.2. Raspberry Pi Event 경로 확인

Pi에서는 카메라 입력을 YOLO ONNX에 넣고, detection과 event가 발생한 frame을 별도로 저장했다.

![[report_ch10_f10-05_runtime_event_frame_samples.jpg]]

> Raspberry Pi runtime에서 각 `SIGN_*` event가 발생했을 때 저장한 원본 frame. 이 이미지는 Bounding Box overlay가 아니라 event 발생 시점의 장면을 모은 것이다.

| Detection class | 초기 검증 Event | 최종 통합 Event |
|---|---|---|
| `left` | `SIGN_LEFT` | `left` |
| `right` | `SIGN_RIGHT` | `right` |
| `straight` | `SIGN_STRAIGHT` | `straight` |
| `horn` | `SIGN_HORN` | `horn` |
| `stop` | `SIGN_STOP` | `stop` |
| `speed_20` | `SIGN_SLOW` | `speed_20` |

`SIGN_*`은 초기 Pi 검증에서 사용한 이름이고, 최종 통합에서는 신호등과 종료선 Event까지 같은 state machine에서 다루기 위해 소문자 이름으로 정리했다. 이름은 바뀌었지만 detection과 Event를 분리한 구조는 그대로 유지했다.

---

## 3. 신호등과 종료선 처리

### 3.1. 초기 색상 기반 설계

초기 구현에서는 표지판 6종만 YOLO로 인식하고, 빨간색·초록색 신호등과 바닥의 빨간 종료선은 OpenCV로 분리했다. 신호등은 lamp의 색 자체가 곧 주행 의미였고, 종료선은 화면 아래쪽에 나타나는 빨간 가로선이라 별도의 객체 탐지 모델까지 사용할 필요는 없다고 봤다.

```text
BGR 이미지
→ HSV 색상 mask
→ contour 후보
→ ROI·형태 조건
→ frame 단위 관측
→ vote·hold를 거친 event
```

Green은 하나의 Hue 범위로 분리했고, red는 OpenCV의 Hue 양 끝에 걸쳐 나타나 두 범위를 합쳤다. 신호등은 화면 우측의 작은 blob을, 종료선은 하단의 넓고 수평인 contour를 찾도록 조건을 다르게 두었다.

![[report_ch11_f11-03c_traffic_mask_contour_sheet.jpg]]

> 신호등 원본, HSV mask와 contour 후보. 작은 lamp가 색상 mask에 남고, 위치와 형태 조건을 통과한 영역이 frame 단위 관측값이 된다.

### 3.2. 신호등만 YOLO로 통합

결과적으로, 신호등 이벤트는 기존 표지판 6-class YOLO에 편입시켰다.

근데 이게 색상 방식이 동작하지 않아서 바꾼 것은 아니었다. 종료선과 같은 방식으로 신호등도 충분히 처리할 수 있다고 봤지만, 다만 시연 환경에서는 주변 조명과 카메라 노출이 달라질 수 있었고 신호등 불빛도 강한 편이 아니었다. HSV 임계값까지 현장에서 관리할 변수로 남겨두기보다, 이미 표지판에 사용하던 YOLO와 Event 경로에 red·green을 합치는 편이 단순하고 더 쉽다고 생각했다.

그래서 표지판 6종에 신호등 두 클래스를 추가해 8-class 모델을 다시 학습했다.

| 인식 대상 | 초기 prototype | 시연 전 구조 |
|---|---|---|
| 표지판 6종 | 6-class YOLO | 8-class YOLO에 유지 |
| red·green 신호등 | HSV + contour | 8-class YOLO에 통합 |
| 종료선 | HSV + contour | OpenCV detector 유지 |

8-class 모델은 `green`, `horn`, `left`, `red`, `right`, `speed_20`, `stop`, `straight`를 예측한다. 표지판과 신호등이 같은 detector를 사용하면서, red·green도 앞에서 만든 detection-to-event 경로를 함께 사용해 각각 `traffic_red`, `traffic_green` event가 된다.

### 3.3. 종료선은 OpenCV로 유지

신호등을 YOLO에 통합한 뒤에도 종료선은 OpenCV로 남겼다. 종료선은 색과 형태, 화면에 나타나는 위치가 분명했고, HSV와 contour만으로도 충분히 가볍게 처리할 수 있었다.

![[report_ch11_f11-05_redline_event_hit_overlay.jpg]]

> 하단 ROI 안에서 넓고 수평인 red contour가 종료선 후보로 남은 장면들. 단순히 빨간 pixel이 있다는 이유만으로 event를 만들지 않고, 위치와 형태를 함께 확인했다.

종료선 detector도 위치와 형태 조건을 통과한 관측을 `final_redline` Event로 내보내는 데까지만 담당했다. 출발선과 도착선이 같은 상황에서 이 Event를 언제 무시하고 받아들일지는 detector가 아니라 주행 state가 판단하도록 분리했다.

---

## 마치며

표지판 인식은 Lane model보다 훨씬 단순할 줄 알았고, 실제로 모델 학습 자체와 탐지 성능 안정화 자체는 금방 끝났다.

근데 자동차에서는 객체를 잘 찾는 것보다, 같은 표지판이 여러 frame에 걸쳐 보일 때 이를 하나의 명령으로 정리하는 과정이 더 중요했다.

결국 detection을 그대로 주행 코드에 넘기지 않고, 각 인식 방식의 차이를 Event라는 공통 출력으로 묶었다.
YOLO로 찾든, 색상과 contour로 찾든, 뒤쪽에서는 같은 형태로 받아들일 수 있게 했다.
