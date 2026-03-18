---
title: MACs (Multiply-Accumulate Operations)
date: 2026-03-19
tags: [seedling]
---

MACs는 곱셈(Multiply) 한 번과 덧셈(Accumulate) 한 번을 묶어서 한 단위로 세는 연산량 지표다. 딥러닝 모델의 [[연산 복잡도 (Computational Complexity)]]를 측정할 때 [[FLOPs (Floating Point Operations)|FLOPs]]보다 더 자주 쓰인다.

## Multiply-Accumulate란?

"곱한 뒤 누적해서 더한다"는 의미다.

$$
a \leftarrow a + (b \times c)
$$

이처럼 곱셈 결과를 기존 값에 더하는 연산을 MAC 연산 하나로 친다.

## 왜 딥러닝에서 자주 쓰이는가?

딥러닝의 핵심 연산은 **내적(Dot Product)** 과 **합성곱(Convolution)** 이다. 둘 다 "어떤 값을 곱하고, 그 결과를 누적해서 더한다"는 구조다.

예를 들어 벡터 내적 $\mathbf{w} \cdot \mathbf{x} = w_1 x_1 + w_2 x_2 + \cdots + w_n x_n$ 은 정확히 $n$번의 MAC 연산이다.

MACs는 딥러닝의 실제 연산 구조를 자연스럽게 표현하기 때문에 FLOPs보다 더 직관적인 지표로 쓰인다.

## FLOPs와의 관계

MACs와 FLOPs는 같은 것을 다르게 세는 방식이다.

$$
1 \text{ MAC} = 2 \text{ FLOPs}
$$

MAC 한 번 = 곱셈 1번 + 덧셈 1번 = FLOPs 2번. 따라서 같은 연산에 대해 FLOPs 수치는 MACs의 2배가 된다. 두 값을 비교할 때 이 관계를 헷갈리지 않아야 한다.

## 포함되지 않는 연산

일반적으로 MACs 계산에 포함되지 않는 연산들이 있다.

- **Pooling** (Max Pooling, Average Pooling 등): 단순 비교나 평균 계산으로, 곱셈이 없다.
- **Activation Function** (ReLU, Sigmoid 등): 비선형 함수 계산이지만, 연산 비중이 작아 통상 제외한다.
- **Batch Normalization**: 별도 계산이 필요하지만, 모델 비교 시 자주 제외된다.

포함 여부는 문헌마다 다를 수 있으므로, 값을 비교할 때 기준을 확인하는 것이 좋다.
