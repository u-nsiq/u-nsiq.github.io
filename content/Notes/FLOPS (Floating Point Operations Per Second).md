---
title: FLOPS (Floating Point Operations Per Second)
date: 2026-03-18
tags: [seedling]
---

FLOPS는 초당 처리할 수 있는 부동소수점 연산의 수다. 하드웨어가 얼마나 빠르게 연산할 수 있는지를 나타내는 **성능 지표**다.

## [[FLOPs (Floating Point Operations)|FLOPs]]와의 차이

- **[[FLOPs (Floating Point Operations)|FLOPs]]**: 모델이 수행하는 총 연산 **횟수**. 모델의 속성.
- **FLOPS**: 하드웨어가 초당 처리하는 연산 **속도**. 하드웨어의 속성.

모델의 FLOPs가 많다고 느린 게 아니다. 하드웨어의 FLOPS가 높으면 같은 FLOPs를 더 빨리 처리할 수 있다. 추론에 걸리는 시간은 대략 다음 관계로 이해할 수 있다.

$$
\text{추론 시간} \approx \frac{\text{모델의 FLOPs}}{\text{하드웨어의 FLOPS}}
$$

## 단위 표기

실제로는 매우 큰 수를 다루기 때문에 접두사를 붙여 표기한다.

| 표기     | 의미                 |
| ------ | ------------------ |
| MFLOPS | 초당 백만($10^6$) 번    |
| GFLOPS | 초당 10억($10^9$) 번   |
| TFLOPS | 초당 1조($10^{12}$) 번 |

현대 GPU는 수십 TFLOPS 수준의 성능을 가진다.

## FP32 vs FP16 FLOPS

같은 하드웨어라도 데이터 타입에 따라 FLOPS가 다르다. 하드웨어 스펙을 볼 때 FP32 FLOPS와 FP16 FLOPS를 구분해서 확인해야 한다.
