---
title: Embedded AI Car
date: 2026-04-24
modified: 2026-05-28
---

![[embedded_ai_car_log11_final_car.jpg]]

'임베디드 인공지능 시스템 최적화' 과목에서 수행한 프로젝트입니다.

## 활동 요약
Raspberry Pi 5 위에서 Lane 인식, 표지판·신호등 인식, 종료선 처리와 모터 제어를 하나의 Runtime으로 통합했으며, 기존 Lane model을 그대로 적용하는 데서 끝내지 않고, 프로젝트 맵에 맞게 학습 목표를 재정의하고 임베디드 환경의 병목을 진단하면서 최종 주행 시스템을 구성했습니다.

---

## 프로젝트 정보

| 항목     | 내용                                                                                    |
| ------ | ------------------------------------------------------------------------------------- |
| 기간     | 2026.04.08–2026.05.28                                                                 |
| 하드웨어   | Raspberry Pi 5 (4GB), Pi Camera, 모터 2개                                                |
| 주요 스택  | Python · PyTorch · ONNX Runtime · OpenCV · YOLO                                       |
| 주요 작업  | Lane 학습·후처리, 데이터 파이프라인, 양자화, 주행 Runtime 및 State machine 통합                            |
| GitHub | [u-nsiq/embedded-ai-optimization](https://github.com/u-nsiq/embedded-ai-optimization) |

---

## 주요 구현

- Local Fit을 이용한 Lane model 학습 목표 재정의
- Local Tangent와 EWA 기반 조향값 계산
- Raspberry Pi의 발열·전원·Latency 병목 진단
- PTQ와 QAT-lite 후보 비교 및 Runtime 경량화
- 표지판·신호등·종료선을 Event로 추상화
- State machine 기반 통합 주행 Runtime 구성

---

## 시리즈

### 시스템 설계와 적용 가능성 검증

1. [[Log 01_개발환경 세팅하기|Log 01. 개발 환경 세팅하기]]
2. [[Log 02_아키텍처 설계|Log 02. 아키텍처 설계]]
3. [[Log 03_Lane Model 적용 가능성 검증|Log 03. Lane Model 적용 가능성 검증]]

### Domain adaptation과 주행 기준 재설계

4. [[Log 04_Label Pipeline 구축하기|Log 04. Label Pipeline 구축하기]]
5. [[Log 05_Fine-tuning 적용과 한계 분석|Log 05. Fine-tuning 적용과 한계 분석]]
6. [[Log 06_Local Fit 기반 학습 목표 재구성|Log 06. Local Fit 기반 학습 목표 재구성]]
7. [[Log 07_Local Tangent 기반으로 조향 설계하기|Log 07. Local Tangent 기반 조향 설계]]

### 임베디드 최적화

8. [[Log 08_임베디드 환경에서의 병목 진단|Log 08. 임베디드 환경에서의 병목 진단]]
9. [[Log 09_Lane Model 양자화|Log 09. Lane Model 양자화]]

### Event 인식과 시스템 통합

10. [[Log 10_표지판·신호등·종료선 인식과 Event 생성|Log 10. 표지판·신호등·종료선 인식과 Event 생성]]
11. [[Log 11_주행 시스템 통합과 최종 시연|Log 11. 주행 시스템 통합과 최종 시연]]

최종 주행 영상은 [[Log 11_주행 시스템 통합과 최종 시연#4. 최종 시연|마지막 글]]에서 확인할 수 있습니다.