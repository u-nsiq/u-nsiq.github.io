---
title: 연산 복잡도 (Computational Complexity)
date: 2026-03-19
tags: [seedling]
---

연산 복잡도는 어떤 알고리즘이나 모델이 수행하는 연산의 양을 나타내는 개념이다. 입력 크기나 모델 구조에 따라 얼마나 많은 계산이 필요한지를 정량적으로 표현한다.

## CS 이론에서의 연산 복잡도

알고리즘 분석에서는 입력 크기 $n$에 따라 연산 횟수가 어떻게 증가하는지를 **Big-O 표기법**으로 나타낸다.

- $O(n)$: 입력에 비례해 선형적으로 증가
- $O(n^2)$: 입력의 제곱에 비례해 증가
- $O(\log n)$: 입력이 늘어도 느리게 증가

시간 복잡도(Time Complexity)와 공간 복잡도(Space Complexity)로 나뉜다.

## 딥러닝에서의 연산 복잡도

딥러닝에서는 모델의 연산 복잡도를 [[FLOPs (Floating Point Operations)|FLOPs]] 또는 [[MACs (Multiply-Accumulate Operations)|MACs]]라는 구체적인 수치로 측정한다. 모델 구조가 고정되어 있기 때문에, Big-O처럼 점근적 표현보다 실제 연산 횟수를 직접 세는 방식이 더 실용적이다.

모델 비교, 경량화 효과 측정, 하드웨어 요구사항 추정 등에 활용된다.
