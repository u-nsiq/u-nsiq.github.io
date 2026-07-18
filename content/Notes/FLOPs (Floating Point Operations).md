---
title: FLOPs (Floating Point Operations)
date: 2026-03-19
tags: [seedling]
---

FLOPs는 어떤 알고리즘이나 모델이 수행하는 부동소수점 연산의 총 횟수다. 모델이 얼마나 많은 계산을 하는지를 나타내는 지표로, [[연산 복잡도 (Computational Complexity)]]를 측정할 때 쓴다.

## 부동소수점 연산이란?

컴퓨터는 실수를 **부동소수점(Floating Point)** 형식으로 표현한다. 덧셈, 뺄셈, 곱셈, 나눗셈 각각이 한 번의 부동소수점 연산이다.

## 딥러닝에서 FLOPs를 셀 때

딥러닝에서 FLOPs를 셀 때는 사실상 곱셈과 덧셈만 센다. 딥러닝의 핵심 연산인 행렬 곱셈(FC Layer)과 합성곱(Conv Layer)이 전체 연산량의 대부분을 차지하며, 이들이 전부 곱셈+덧셈 구조이기 때문이다. **ReLU**, **Pooling**, Batch Normalization 같은 연산도 존재하지만 전체 대비 비중이 매우 작아 통상 제외한다.

즉, "딥러닝 모델의 FLOPs를 센다"는 말은 사실상 "지배적인 연산인 곱셈과 덧셈의 횟수를 센다"와 동치처럼 쓰인다.

## FLOPs vs FLOPS

철자가 비슷해서 혼동하기 쉽지만, 두 개는 다른 개념이다.

- **FLOPs** (소문자 s): Floating Point **Operations**. 총 연산 **횟수**. 모델의 [[연산 복잡도 (Computational Complexity)]] 측정에 사용.
- **[[FLOPS (Floating Point Operations Per Second)|FLOPS]]** (대문자 S): Floating Point Operations **Per Second**. 초당 연산 **처리 속도**. 하드웨어 성능 측정에 사용.

연산 횟수(FLOPs)는 모델의 속성이고, 처리 속도(FLOPS)는 하드웨어의 속성이다. 모델이 FLOPs가 많다고 느리다는 뜻이 아니고, 하드웨어의 FLOPS가 높으면 같은 FLOPs를 더 빨리 처리한다.

## FLOPs를 왜 쓰는가?

모델이 무거운지 가벼운지를 **파라미터 수(Parameter Count)** 만으로 판단하기 어려운 경우가 있다. 파라미터 수가 같아도 구조에 따라 실제 연산량이 다를 수 있기 때문이다. 예를 들어 FC 레이어와 Conv 레이어의 파라미터 수가 같더라도, Conv는 출력 공간의 모든 위치마다 같은 필터로 연산을 반복하기 때문에 FLOPs가 훨씬 클 수 있다.

FLOPs는 실제 연산 부담을 더 직접적으로 나타낸다. 즉, FLOPs를 알면 모델이 추론 시 얼마나 많은 계산을 수행하는지, 그에 따른 속도와 전력 소비가 어느 수준인지를 실질적으로 비교할 수 있다.

- **모델 비교**: 두 모델 중 어떤 게 더 연산이 적은지 판단
- **경량화 효과 측정**: Pruning 등 최적화 적용 전후 연산량 변화 확인
- **하드웨어 요구사항 추정**: 실시간 처리 가능 여부 판단

## 주의사항

FLOPs는 문헌마다 계산 방식이 조금씩 다르다.

- 곱셈만 세는 경우도 있고, 곱셈+덧셈을 각각 1 FLOPs씩 세는 경우도 있다.
- 어떤 문헌은 곱셈+덧셈 한 쌍을 2 FLOPs로 세고, 어떤 문헌은 이 쌍을 1 FLOPs로 세기도 한다.
- 두 모델의 FLOPs를 비교할 때는 같은 기준으로 계산된 값인지 확인해야 한다.

이 때문에 딥러닝에서는 FLOPs보다 더 명확하게 정의된 [[MACs (Multiply-Accumulate Operations)|MACs]]를 더 많이 사용하는 추세다.
