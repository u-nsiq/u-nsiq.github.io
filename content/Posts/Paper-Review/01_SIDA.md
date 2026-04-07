---
title: "SIDA: LMM 기반 딥페이크 탐지 및 XAI 프레임워크 리뷰"
date: 2026-04-08
draft: false
---

> [!info] PAPER INFO
> **Title:** SIDA: Social Media Image Deepfake Detection, Localization and Explanation with Large Multimodal Model
> **Authors:** Huang et al.
> **Year / Venue:** 2025 · CVPR 2025
> **Links:** [Paper](https://arxiv.org/abs/2412.04292) · [CVF](https://openaccess.thecvf.com/content/CVPR2025/html/Huang_SIDA_Social_Media_Image_Deepfake_Detection_Localization_and_Explanation_with_CVPR_2025_paper.html)

요즘 학교에서 XAI 관련 서베이 프로젝트를 진행하고 있다.
그래서 관련 논문들을 읽고 리뷰 발표하는 중이고, 이 포스트는 내 발표 준비를 위해 작성한 리뷰 노트다!

내가 읽은 논문은 소셜미디어 딥페이크 이미지를 탐지하고, 조작된 위치를 마스킹으로 찾고, 왜 가짜인지까지 텍스트로 설명하는 모델을 제안한 논문이다.

논문을 읽어본 적이 아예 없는 건 아니지만, 이렇게까지 논문 전체를 이해하기 위해 읽어본 적은 이번이 처음인 것 같다...(리뷰 포스트 자체도 처음)
리뷰 발표 자체가 듣는 사람이 이해될 수 있도록 설명을 해야 하니, 결국 내가 논문 전체를 완전히 이해하고 있어야 한다고 생각했다.
그래서 논문에서 모르는 개념들이 나올 때마다 그쪽으로 빠져서 이해하고 다시 읽고를 반복했고, 결과적으로 논문 Review Note를 작성하는 데에만 대략 4일이 걸린 것 같다.
여기서 Self-Attention 개념이 나오는데, 난 이 개념을 몰랐어서 4일 중 2일 간은 저 개념 이해한다고 RNN부터 ViT, Transformer 등을 공부하는 데 시간을 쓰긴 했다.

사실 중간에 좀 지치긴 했었는데, 근데 또 막상 개념들 알고 다시 논문 읽을 때 잘 읽히기도 하고 Method가 어떤 원리인지 머릿속에서 그려지기 시작해서 재밌어지긴 했었다.

이 리뷰노트는 그 과정에서 정리한 내용을 담은 거라, SIDA를 이해하는 데 필요한 개념들을 같이 짚으면서 논문을 따라가는 방식으로 쓰여졌다.

## 1. Introduction

### 1.1 배경(Motivation)

최근 생성형 AI(generative AI)의 발전으로 ==실제 사건을 담은 것처럼 보이는 이미지==를 만들어내는 일이 점점 쉬워지고 있다.
이 기술이 ==악의적으로 활용==되면, 여론을 오도하거나 역사적 기록을 왜곡하는 기만적인 콘텐츠를 소셜 미디어를 통해 광범위하게 퍼뜨릴 수 있다.

이런 위협에 대응하기 위해 컴퓨터 비전 분야에서 딥페이크 탐지(deepfake detection) 연구가 본격적으로 이루어져 왔다.

그런데 기존 탐지 방법들은 대부분 **facial** 이미지, 즉 얼굴 조작 탐지에만 집중되어 있었다.
사회적 파급력이 크다 보니 자연스럽게 연구가 얼굴 쪽으로 쏠렸지만, ==소셜 미디어에서 실제로 유통되는 가짜 이미지는 얼굴만이 아니다.==
뉴스 사진 속 사물을 슬쩍 교체하거나, 동물 사진에서 종(種)을 바꾸는 **non-facial** 조작이 오히려 더 교묘하고 탐지하기 어렵다.

이것이 이 논문이 출발하는 지점이다.

### 1.2 기존 방법의 두 가지 한계

논문은 기존 딥페이크 탐지 연구가 데이터셋과 방법론 두 측면에서 공통적으로 두 가지 한계를 가진다고 지적한다.

**한계 1 — Insufficient Diversity(다양성 부족).**
==기존 데이터셋들은 facial 이미지에 편중==되어 있고, 소셜 미디어에 특화된 ==대규모 non-facial 딥페이크 데이터셋이 사실상 없다.==
있더라도 구형 생성 모델로 만들어져 사람이 보기에도 티가 나는 수준이라 현실을 반영하지 못한다.

**한계 2 — Limited Comprehensiveness(포괄성 부족) + Explanation 부재.**
기존 방법론과 데이터셋은 아래 두 task 중 하나에만 특화된 경우가 대부분이다.

- **Detection(탐지)** — 이미지 전체를 보고 real인지 fake인지 판별하는 task. 본질적으로 이미지 ==분류(Classification)== 문제다.
- **Localization(위치 추정)** — 이미지의 일부가 tampered(부분 조작)됐을 때, 조작된 영역이 픽셀 단위로 어디인지 마스크로 찾아내는 task. 이미지 ==분할(Segmentation)== 문제에 해당한다.

![[image-undefined-x306-y342.png]]
> *Figure 1. 기존 방법(a, b)과 SIDA(c)의 비교*

Figure 1이 이 구도를 잘 보여준다.

기존 방법들은 **Detection**만 하거나(a), **Localization**만 하거나(b) 각자의 task에 머문다.
그리고 둘 다 결정적으로 **Explanation**, 즉 "왜 이 이미지가 가짜인가?"에 대한 근거를 전혀 제공하지 못한다. 탐지 결과가 나와도 ==모델이 어떤 단서로 그 판단을 내렸는지는 블랙박스==로 남는다.

### 1.3 이 논문의 제안

이 두 한계를 동시에 해결하기 위해 논문은 두 가지를 기여로 제안한다.

- **SID-Set** (Social media Image Detection dataSet)
	- Real / Synthetic(완전 AI 생성) / Tampered(부분 조작) 각 10만 장씩 총 30만 장 규모의 소셜 미디어 특화 딥페이크 데이터셋.
	- 기존 데이터셋과의 차별점은 정답 레이블이 세 종류 모두 갖춰져 있다는 점이다 — 분류 레이블(Detection용) + 픽셀 마스크(Localization용) + 텍스트 설명(Explanation용).

- **SIDA** (Social media Image Detection, localization, and explanation Assistant)
	- ==Detection + Localization + Explanation을 하나의 파이프라인으로 수행==하는 VLM 기반 프레임워크.
	- SID-Set과 다른 벤치마크 모두에서 SOTA 성능을 달성했다.

---

## 2. Related Work

### 2.1 Deepfake 데이터셋의 흐름

딥페이크 탐지 연구는 오랫동안 **facial** 이미지 중심이었다.
ForgeryNet, DeepFakeFace, DFFD 같은 대표적인 데이터셋들이 이 흐름을 주도했는데, 이 데이터셋들은 모두 ==얼굴 조작 탐지에 특화==되어 있다.

그러다 GAN과 Stable Diffusion 같은 ==생성 모델이 발전하면서 non-facial 영역으로 확장한 대규모 데이터셋들이 등장==하기 시작했다 — GenImage, HiFiIFDL, DiffForensics 등이 그 예다.

이들은 데이터 규모, 생성 방식의 다양성, 세부 annotation 측면에서 발전을 이뤘지만, 논문은 SID-Set이 ==소셜 미디어 데이터에 특화==되어 있고, 최신 ==SOTA 생성 모델을 활용==했으며, 훨씬 ==포괄적이고 다양한 annotation을 제공==한다는 점에서 차별화된다고 설명한다.

![[image-2-x315-y601.png]]
> *Table 1. 기존 딥페이크 데이터셋들과 SID-Set의 비교. Multiclasses / Masks / Explanation 세 컬럼에 SID-Set만 모두 해당된다.*

Table 1에서 직접 확인할 수 있는 건 레이블 구성의 차이다.
기존 데이터셋들은 Masks 하나만 제공하거나 아예 없는 경우가 많다.
Multiclasses(Real/Synthetic/Tampered 다중 분류)와 Explanation(텍스트 설명 레이블)을 동시에 갖춘 건 SID-Set이 유일하다.
### 2.2 Image Deepfake Detection and Localization

기존 딥페이크 탐지 방법들은 대부분 이미지 분류(Classification) 문제로 접근했다.
CNN, Transformer, data augmentation, adversarial training 등 다양한 기법이 시도됐지만, 공통적인 약점은 **일반화(generalization)** 능력이다. 학습 때 보지 못한 새로운 조작 방식이나 도메인이 달라지면 성능이 급격히 떨어진다.

한 단계 더 나아간 연구들은 단순 분류를 넘어, 조작된 영역을 픽셀 단위 마스크로 찾아내는 Localization까지 함께 다루기 시작했다.
하지만 이 데이터셋들조차 여전히 대부분 facial 데이터에 집중되어 있고, ==non-facial + 소셜 미디어 규모의 대규모 공개 데이터셋은 여전히 부재==한 상태다.

### 2.3 Large Multimodal Models

VLM(Vision-Language Model)의 발전이 딥페이크 탐지 분야에도 영향을 미치기 시작했다.

- AntifakePrompt는 탐지를 시각적 질의응답(VQA) 문제로 재정의.
- FakeShield는 LLaVA 기반으로 조작 영역 탐지와 텍스트 설명을 함께 제공.
- ForgeryGPT는 포렌식 지식을 통합한 픽셀 단위 탐지를 시도.

이들은 ==VLM의 멀티모달 추론 능력을 딥페이크 탐지에 접목한 시도==라는 점에서 SIDA와 방향이 같다.

SIDA가 이들과 구별되는 지점은, 소셜 미디어 특화 대규모 데이터셋을 직접 구축했다는 것, 그리고 Detection + Localization + Explanation을 하나의 통합 프레임워크로 처리한다는 것이다.

---

## 3. Benchmark

### 3.1 Motivation — SID-Set을 왜 새로 만들었나

딥페이크 탐지 연구가 non-facial 영역으로 확장되면서 GenImage, AIGCD 같은 데이터셋들이 등장했지만, 이것들도 세 가지 한계를 가진다.

첫째, ==fully synthetic 이미지를 만들 때 구형 생성 모델을 사용==해서 퀄리티가 낮고, 사람이 보기에도 티가 날 정도다.

둘째, text-to-image 또는 image-to-image 생성에만 집중하다 보니 **tampered 이미지** — ==원본의 특정 영역만 교묘하게 바꿔치기한 이미지가 없다.==
이런 부분 조작은 미묘한 오정보를 심어두는 방식이라 오히려 더 위험하고, 기존 탐지 방법으로는 잡아내기 어렵다.

셋째, "왜 가짜인지"에 대한 기준이나 ==설명 레이블이 없다.==

더 근본적인 문제는 따로 있다.
기존 데이터셋들이 fully synthetic과 tampered 중 하나만 다루도록 설계되어 있다 보니, 그걸로 학습한 모델들도 둘 중 하나만 처리할 수 있다. — 완전 합성 이미지와 실제 이미지를 분류하거나(Detection), 조작된 이미지의 어느 부분이 조작되었는지 마스킹(Localization).

그런데 ==현실에서는 가짜 이미지를 마주쳤을 때 그게 어느 유형인지 미리 알 수 없다.== 유형을 모르면 어떤 모델을 써야 할지조차 결정할 수 없다는 뜻이다.
두 케이스를 하나의 모델이 함께 처리하려면, 둘 다 담긴 데이터셋이 먼저 필요하다.

이것이 SID-Set을 제안한 동기다.

### 3.2 SID-Set 구성

SID-Set은 세 종류의 이미지 각 10만 장, 총 30만 장으로 구성된다.

**Real Images (100K)**
구글이 공개한 실제 세상 사진 데이터셋인 ==OpenImages V7에서 가져온 이미지다.== 실세계의 다양한 장면을 반영한다.

**Synthetic Images (100K)**
텍스트 프롬프트만으로 완전히 새로 그려낸 AI 생성 이미지다. ==생성 모델로는 FLUX를 사용했다.==
Kandinsky 3.0, SDXL, AbsoluteReality 등 여러 SOTA 오픈소스 모델을 비교 실험했고, 전문가 5명이 블라인드 테스트를 수행한 결과 FLUX가 가장 현실과 구별하기 어려운 이미지를 만들어낸다고 판단해 최종 선택됐다.

프롬프트의 경우, 직접 만드는 대신 실제 사진에 텍스트 캡션이 달린 ==기존 데이터셋인 Flickr30k와 COCO의 캡션을 그대로 활용==했다.
예를 들어 *"A large fluffy cat laying on top of a wooden table"* 같은 캡션을 FLUX에 입력하면, 그 설명에 맞는 이미지를 완전히 새로 그려낸다.

**Tampered Images (100K)**
원본 이미지의 특정 객체나 영역만 교묘하게 바꿔치기한 이미지다.
아래 3.3절에서 설명하는 ==4단계 파이프라인으로 자동 생성==했다.

### 3.3 Tampered 이미지 생성 파이프라인

Tampered 이미지 10만 장을 어떻게 자동으로 대량 생성했는지가 이 섹션의 핵심이다.
베이스는 COCO 데이터셋이다. COCO(Common Objects in Context)는 사진 안에 어떤 객체가 어디 있는지, 텍스트 캡션과 위치 레이블이 달린 실제 이미지 데이터셋인데, 저자들은 이 COCO 사진들을 원본으로 삼아 조작 이미지를 만들었다.

![[image-4-x50-y516.png]]
> *Figure 3. Tampered 이미지 자동 생성 4단계 파이프라인.*

**Stage 1**에서는 ==GPT-4o를 이용해 COCO 이미지의 텍스트 캡션에서 조작할 대상 객체를 추출==한다.
예를 들어 _"A large fluffy cat laying on top of a wooden table"_ 이라는 캡션이 있으면, GPT-4o가 여기서 "cat"을 조작 대상으로 뽑아내는 식이다.

**Stage 2**에서는 ==Language-SAM으로 그 객체의 픽셀 마스크를 생성==한다.
Language-SAM은 Meta의 SAM(Segment Anything Model)에 텍스트 모듈을 붙인 것으로, "cat"이라는 텍스트만 입력하면 사진 속에서 해당 객체를 찾아 픽셀 단위 마스크를 반환한다. 이 마스크가 곧 Localization task의 정답 레이블(Ground Truth)이 된다. 즉, 이미지를 조작하기 전에 "어디를 조작했는지"에 대한 정답지를 먼저 자동으로 만들어두는 구조다.

**Stage 3**에서는 그 ==객체를 어떻게 바꿀지에 대한 규칙==을 정한다. 조작 방식은 두 종류로 나뉜다.
**1) Object replacement**는 "dog"를 "cat"으로 바꾸는 식의 객체 자체를 교체하는 방식으로, 80,000장을 생성했다.
**2) Attribute modification**은 "dog"를 "angry dog"으로 바꾸는 식의 속성만 수정하는 방식으로, 20,000장을 생성했다.

**Stage 4**에서는 ==수정된 캡션과 Stage 2의 마스크를 Latent Diffusion 모델에 입력==한다.
Latent Diffusion은 이미지를 압축된 잠재 공간(latent space)으로 변환한 뒤 그 위에서 생성 작업을 수행하는 이미지 생성 방식이다. 여기서는 이미지 전체를 새로 그리는 게 아니라, 마스크로 지정된 영역만 수정된 캡션 조건에 맞게 다시 그려 채운다(inpainting). "cat → dog"로 바꾸는 경우라면, 고양이가 있던 픽셀 영역만 "dog"라는 조건으로 새로 생성되는 식이다.

![[image-4-x310-y393.png]]
> *Figure 4. Object Replacement(새→독수리, 고양이→개)와 Attribute Modification(보드 변화, 테이블 위 객체 제거) 예시.*

### 3.4 SID-Set의 레이블 구성

SID-Set의 30만 장은 세 종류의 정답 레이블을 갖는다.

- **클래스 분류 레이블 (Detection)** — 전체 30만 장 모두에 `Real` / `Synthetic` / `Tampered` 중 하나의 정답 클래스가 달린다.
- **픽셀 마스크 레이블 (Localization)** — Tampered 이미지 10만 장에만 픽셀 단위로 칠해진 정답 마스크가 포함된다. Real과 Synthetic은 조작된 부분이 없으므로 빈 마스크로 처리된다.
- **텍스트 설명 레이블 (Explanation)** — 30만 장 중 클래스별로 균등하게 1,000장씩, 총 3,000장에만 GPT-4o가 생성한 "왜 이 이미지가 이 클래스인지"에 대한 상세한 판단 근거 텍스트가 달린다. SIDA가 Explanation 능력을 학습하려면 이 텍스트 레이블이 필요하기 때문에 별도로 구축했다.

---

## 4. Method

### 4.1 Architecture

VLM(Vision-Language Model)은 이미지와 텍스트를 함께 이해하는 멀티모달 추론 능력을 갖추고 있다.
그러나 딥페이크를 효과적으로 탐지하고 위치를 추정하려면, ==멀티모달 이해 능력만으로는 부족==하다. 조작된 영역을 식별하고 분할하는 능력, 그리고 그 판단 근거를 설명하는 능력까지 갖춰야 한다.

이를 위해 본 논문은 SIDA를 제안한다.

SIDA는 ==Detection(탐지) + Localization(위치 추정) + Explanation(설명)을 하나의 파이프라인으로 수행하는 VLM 기반 프레임워크==다.
기존 VLM 단어장에 `<DET>`와 `<SEG>` 두 개의 특수 토큰을 추가해서, 이미지를 입력받으면 Real/Synthetic/Tampered 분류, 조작 영역 픽셀 마스크, 텍스트 판단 근거를 동시에 출력한다.

![[image-5-x42-y450.png]]
> *Figure 5. SIDA 파이프라인. 이미지 $x_i$와 텍스트 $x_t$가 입력되면, VLM이 텍스트 설명 $\hat{y}_{des}$ 를 출력하고, 마지막 은닉층에서 `<DET>`와 `<SEG>` 토큰의 hidden state를 추출해 Detection과 Localization을 수행한다.*


#### 4.1.1 베이스라인 — LLaVA에서 SIDA까지

SIDA의 구조를 이해하려면 그 계보를 먼저 알아야 한다.

**LLaVA**는 ViT(이미지를 패치 토큰으로 변환)와 LLaMA(트랜스포머 기반 LLM)를 Projection Layer로 연결한 VLM이다.
ViT가 이미지를 패치 단위로 쪼개서 토큰으로 만들면, Projection Layer가 그 벡터를 LLM이 이해할 수 있는 임베딩 공간으로 변환한다. 이후 LLM이 이미지 토큰과 텍스트 토큰을 하나의 시퀀스로 받아 Self-Attention으로 처리하면서 이미지를 보고 텍스트로 답하는 능력을 갖추게 된다.
그러나 ==LLaVA는 출력이 텍스트뿐이라 픽셀 단위 마스크를 직접 출력하지 못한다.==

**LISA**는 이 ==LLaVA에 마스킹 능력을 추가한 모델==이다.
단어장에 `<SEG>` 토큰을 하나 추가하고, 그 토큰의 마지막 Layer hidden state를 SAM 기반 Decoder에 연결해서 픽셀 마스크를 출력할 수 있게 했다.
이미지는 두 경로로 처리된다 — LLaVA 내부에서 이미지-텍스트 통합 이해를 위해 한 번, SAM ViT-H(Frozen)에서 픽셀 단위 시각적 특징 추출을 위해 또 한 번.
이 두 정보를 Decoder에서 합쳐야 정확한 픽셀 마스크를 그릴 수 있다.

**SIDA**는 이 ==LISA를 딥페이크 탐지에 특화시킨 프레임워크==다.
LISA는 reasoning segmentation을 위한 모델이라, Real/Synthetic/Tampered를 판별하는 전용 분류 구조가 없고, Detection 정보를 Segmentation에 연결하는 구조도 없다.
SIDA는 이 두 가지를 추가했다 — `<DET>` 토큰과 Detection Head로 3개 클래스 분류와, Attention Module로 Detection 정보와 Segmentation 정보의 연결을 추가했다.

**결과적으로 SIDA는,**
LLaVA가 ViT와 LLM을 연결한 기반 위에, LISA가 `<SEG>` 토큰과 SAM Decoder를 얹어 마스킹 능력을 추가했고, SIDA는 거기에 다시 `<DET>` 토큰과 Detection Head, Attention Module을 더해 딥페이크 탐지에 특화된 완전한 파이프라인을 완성했다.

![[Pasted image 20260406050425.png]]
> _Figure 3 (LISA). 이미지와 텍스트 질문이 입력되면, Multimodal LLM이 텍스트를 생성하고, `<SEG>` 토큰의 마지막 Layer embedding이 SAM Decoder를 통해 픽셀 마스크로 변환된다._

#### 4.1.2 토큰 확장과 VLM 입출력 (수식 1)

SIDA는 ==기존 VLM 단어장에 두 개의 특수 토큰을 추가==한다.

- **`<DET>`** — Real/Synthetic/Tampered 판별을 위한 토큰
- **`<SEG>`** — 조작 영역 마스킹을 위한 토큰

이미지 $x_i$와 텍스트 프롬프트 $x_t$를 VLM에 입력하면 두 가지 출력이 나온다.

$$
\hat{y}_{des} = \text{VLM}(x_i, x_t)
$$

하나는 겉으로 보이는 **텍스트 설명** $\hat{y}_{des}$고, 다른 하나는 모델 내부 마지막 은닉층에 저장된 **`<DET>`와 `<SEG>` 토큰의 hidden state**다.
두 토큰은 모든 트랜스포머 Layer를 거치면서 이미지 토큰, 텍스트 토큰들과 Self-Attention으로 상호작용하며 각자 필요한 정보를 흡수한다.
마지막 Layer의 hidden state가 가장 풍부한 표현을 담고 있기 때문에, 여기서 두 토큰의 벡터를 추출해 각각의 task에 활용한다.

#### 4.1.3 Detection (수식 2)

마지막 은닉층에서 `<DET>` 토큰의 hidden state $h_{det}$를 뽑아낸다.
이를 Detection Head $F_{det}$ (FC Layer × 2)에 통과시켜 이미지를 세 클래스 중 하나로 판별한다.

$$
\hat{D} = F_{det}(h_{det})
$$

LLM이 텍스트로 "tampered"라는 단어를 생성하는 것과 달리, FC Layer가 오직 3개 클래스 판별만을 목적으로 학습되기 때문에 훨씬 명확하고 정확한 분류가 가능하다.
판별 결과 $\hat{D}$가 ==Tampered일 때만 다음 Localization 단계로 넘어간다.==


#### 4.1.4 Localization — Attention Module (수식 3)

`<SEG>` hidden state $h_{seg}$만으로 마스크를 그리면 부정확하다. $h_{det}$에는 "왜 이 이미지가 조작됐는지"에 대한 판별 정보가 담겨 있으니, 이걸 마스킹에도 반영하면 더 정확한 마스크를 기대할 수 있다.

$h_{det}$과 $h_{seg}$는 같은 LLM에서 나온 벡터라 차원은 동일하다. 그런데도 $h_{det}$을 FC Layer에 먼저 통과시키게 된다.
그 이유는, $h_{det}$은 Detection 판별용으로 학습된 벡터인데, 이걸 Attention의 Query로 쓰려면 "마스킹에 필요한 정보를 찾아내는 Query" 역할에 맞게 변환해줘야 하기 때문이다.

$$
\tilde{h}_{det} = F(h_{det})
$$

이제 $\tilde{h}_{det}$을 Query로, $h_{seg}$를 Key/Value로 삼아 Multi-head Self-Attention을 수행한다.
$h_{det}$이 "조작 판단 정보"를 갖고 있으니, 그 관점에서 $h_{seg}$의 어느 부분이 중요한지를 골라내는 구조다.

$$
\tilde{h}_{seg} = \text{MSA}(\tilde{h}_{det},\ h_{seg},\ h_{seg})
$$ 

$$
\tilde{h}_{seg} = \tilde{h}_{seg} + h_{seg}
$$

마지막에 원래 $h_{seg}$를 더하는 게 **Residual Connection**이다.
Attention으로 얻은 새 정보를 추가하되, 원래 $h_{seg}$가 갖고 있던 정보도 그대로 보존하는 역할이다.
논문의 Ablation 실험에서 이 Attention Module을 제거하거나 FC Layer로 대체했을 때 성능이 유의미하게 하락했는데, 이는 단순히 두 벡터의 차원을 맞춰 섞는 것만으로는 부족하고 Detection 정보가 Segmentation을 가이드하는 구조가 핵심임을 보여준다.

#### 4.1.5 최종 마스크 생성 (수식 4)

SIDA도 LISA와 마찬가지로 ==이미지를 두 경로로 처리==한다.
VLM 내부에서는 이미지-텍스트 통합 이해와 추론을 담당하고, 별도의 SAM ViT-H(Frozen)에서는 픽셀 단위 시각적 특징 $f$를 추출한다.
둘 다 내부적으로 Self-Attention을 사용하지만, 학습된 목적과 데이터가 달라 뽑아내는 특징이 다르다.

$$
f = F_{enc}(x_i), \quad \hat{M} = F_{dec}(\tilde{h}_{seg},\ f)
$$

Attention으로 정제된 $\tilde{h}_{seg}$를 MLP $\gamma$로 차원 변환한 뒤, $f$와 함께 Decoder에 입력해서 최종 픽셀 마스크 $\hat{M}$을 출력한다.
$\tilde{h}_{seg}$는 "어디를 마스킹해야 하는지"에 대한 의미적 정보를, $f$는 "이미지가 픽셀 단위로 어떻게 생겼는지"에 대한 시각적 정보를 담당한다. 둘을 합쳐야 정확한 픽셀 마스크를 그릴 수 있다.

---

### 4.2 Training

#### 4.2.1 2단계 학습 전략

SIDA는 학습을 두 단계로 나눠서 진행한다:

==1) Detection과 Segmentation을 먼저 학습==하고,
그 다음에 ==2) Explanation 능력을 추가==하는 순서다.

한 번에 세 가지를 동시에 학습하지 않는 이유는, Explanation을 위한 텍스트 레이블이 전체 30만 장 중 3,000장에만 있기 때문이다.
모든 데이터에 텍스트 정답이 있는 Detection과 Segmentation을 먼저 충분히 학습한 뒤, 텍스트 생성 능력만 추가로 fine-tuning하는 전략이다.


#### 4.2.2 1단계 — Detection + Segmentation 학습 (수식 5)

SAM ViT(이미지 인코더)는 ==Frozen 상태==로 두고, ==나머지 모듈을 end-to-end로 학습==한다.
Loss는 ==Detection 손실과 Mask 손실의 합==으로 구성된다.

$$
\mathcal{L} = \lambda_{det}\mathcal{L}_{det} + \lambda_{mask}\mathcal{L}_{mask}
$$

$$
\mathcal{L}_{det} = \mathcal{L}_{CE}(\hat{D}, D)
$$

$$
\mathcal{L}_{mask} = \lambda_{bce}\mathcal{L}_{BCE}(\hat{M}, M) + \lambda_{dice}\mathcal{L}_{DICE}(\hat{M}, M)
$$

탐지는 3개 클래스 중 하나를 맞추는 문제라 **CrossEntropy**를 쓴다.
마스크는 픽셀마다 조작 여부(0 or 1)를 맞추는 문제라 **Binary CrossEntropy**와 **DICE Loss**를 섞어 쓴다.

DICE Loss는 예측 마스크와 정답 마스크의 겹치는 영역 비율을 기준으로 Loss를 계산하는 방식으로, 마스크 크기가 작거나 불균형할 때도 안정적으로 학습할 수 있게 해준다.

#### 4.2.3 2단계 — Explanation Fine-tuning (수식 6)

1단계가 끝난 모델에 "왜 가짜인지 설명하는 능력"을 추가로 학습한다.
3절에서 GPT-4o로 만들어둔 3,000장의 텍스트 레이블을 정답으로 삼아, ==VLM 부분만 LoRA로 fine-tuning==한다.

==이미지 인코더는 계속 Frozen 상태를 유지==하고, ==LLM의 텍스트 생성 방식만 집중적으로 교정==하는 것이다.

$$
\mathcal{L}_{txt} = \mathcal{L}_{CE}(\hat{y}_{des}, y_{des})
$$

$$
\mathcal{L}_{total} = \lambda_{det}\mathcal{L}_{det} + \lambda_{mask}\mathcal{L}_{mask} + \lambda_{txt}\mathcal{L}_{txt}
$$

기존 Loss에 텍스트 생성 손실 $\mathcal{L}_{txt}$가 추가된다.
텍스트 생성은 Auto-regressive 방식으로 토큰을 하나씩 예측하므로, 각 토큰의 예측 확률 분포와 정답 토큰 간의 **CrossEntropy**를 Loss로 사용한다.

#### 4.2.4 학습 데이터

주요 학습 데이터는 SID-Set 30만 장이다.
여기에 외부 데이터셋인 MagicBrush를 저품질 이미지를 걸러낸 뒤 추가로 섞어서 다양성을 높였다.

MagicBrush는 자연어 지시에 따라 이미지를 편집한 데이터셋으로, tampered 이미지의 다양한 조작 패턴을 보강하는 역할을 한다.


---

## 5. Experiments

### 5.1 Experiment Setup

SIDA의 베이스 모델은 LISA다. 추론 기반 위치 추정 능력이 뛰어난 LISA-7B-v1과 LISA-13B-v1 두 버전을 모두 실험했다.

SID-Set으로 fine-tuning할 때는 LoRA($\alpha$=16, dropout=0.05)를 사용했고, 입력 이미지는 1024×1024로 resize했다.

**평가지표**는 task별로 다르다.
Detection은 이미지 전체 단위의 **Accuracy**와 **F1 Score**로 평가하고,
Localization은 마스크 품질을 측정하는 **AUC**, **F1 Score**, **IoU**(Intersection over Union)로 평가한다.

참고로 IoU는 예측 마스크와 정답 마스크가 겹치는 영역의 비율로, 1에 가까울수록 정확한 마스크를 그렸다는 뜻이다.

**대조군 평가 전략**은 공정한 비교를 위해 ==2단계로 진행==한다.
먼저 ==1) 각 모델의 원래 사전학습 가중치 그대로 SID-Set에서 테스트==하고(괄호 밖 수치),
그 다음 ==2) SID-Set으로 재학습한 뒤 다시 테스트==한다(괄호 안 수치).

SIDA는 SID-Set으로 학습된 모델이기 때문에, 다른 모델들도 같은 데이터로 재학습시킨 뒤 비교해야 아키텍처 자체의 우열을 가릴 수 있기 때문이다.


### 5.2 Detection (Table 2)

논문은 SIDA가 평가된 모든 방법 중 더 나은 또는 동등한 결과를 달성했다고 주장한다.
다만 재학습 후 LGrad가 Tampered 탐지에서 가장 높은 F1 Score를 기록하는 예외가 있는데, 이는 실제로 잘 탐지한 게 아니라 모든 이미지를 일단 Tampered로 분류하는 경향에서 비롯된 것이라고 분석한다. Real과 Synthetic에서 재학습 후 오히려 성능이 하락한다는 점이 이를 뒷받침한다.

![[image-7-x52-y517.png]]
> _Table 2. SID-Set Detection 성능 비교. 괄호 밖은 원래 가중치로 테스트한 수치, 괄호 안은 SID-Set 재학습 후 성능 변화량._

SIDA와 공정하게 비교하려면 괄호 밖 수치에 괄호 안 수치를 더해서 봐야 한다.
괄호 밖 수치만 보면 SIDA가 SID-Set으로 학습된 모델이니 당연히 앞서 보이지만, 재학습 후 수치까지 합산하면 다른 모델들도 따라잡는 경우가 있어서 비교가 더 의미있어진다.
LGrad의 경우 Tampered F1은 높지만 전체 Accuracy는 낮은데, 이게 바로 "무조건 Tampered라고 찍는" 패턴의 증거다.

### 5.3 Localization (Table 3)

논문은 SIDA가 Localization에서도 최고 성능을 달성했다고 주장한다.
특히 SIDA의 베이스라인인 LISA를 SID-Set으로 fine-tuning한 버전과 비교해서도 SIDA가 앞서는데, 이에 대해 논문은 LISA가 일반적인 분할 능력은 뛰어나지만 딥페이크의 미묘한 조작을 탐지하는 데 필요한 특화 구조가 없어서 fine-tuning 효과가 제한된다고 분석한다.
즉, `<DET>` 토큰과 Attention Module을 추가한 SIDA의 아키텍처 설계 자체가 유효했음을 보여준다.

![[image-7-x52-y191.png]]
> _Table 3. SID-Set Localization 성능 비교. `*`는 훈련 코드를 이용할 수 없어 사전학습 가중치를 그대로 사용한 모델._

MVSS-Net과 HIFI-Net은 `*` 표시가 되어 있어, 재학습 없이 원래 가중치로만 테스트했다.
비교 대상 중 LISA-7B-v1도 포함되어 있는데, 이게 SIDA 아키텍처 변경의 당위성을 직접 증명하는 비교라고 할 수 있다.
같은 SID-Set으로 fine-tuning했는데도 SIDA가 LISA보다 AUC, F1, IoU 모두에서 앞선다.

### 5.4 Robustness (Table 4)

실제 소셜미디어에서 이미지는 업로드 과정에서 JPEG 압축, 크기 조정, 노이즈 등 화질 열화가 발생한다.
탐지 모델이 이런 열화를 조작으로 오해하거나, 반대로 진짜 조작된 픽셀 단서를 놓칠 수 있다. 논문은 열화 데이터로 명시적으로 학습하지 않았음에도 SIDA가 이런 조건에서 안정적인 성능을 보인다고 주장한다.

![[image-7-x318-y310.png]]
> _Table 4. 6가지 화질 열화 조건에서 SIDA 성능. JPEG 압축(quality 70, 80), Resize(0.5, 0.75배), Gaussian Noise(분산 5, 10)._

원본 SIDA-7B 기준(마지막 행)과 비교하면, 6가지 열화 조건 모두에서 수치가 소폭 하락하긴 하지만 급격히 무너지지 않는다. Gaussian Noise 분산 10이 가장 성능 하락이 크고, Resize 0.75가 가장 영향이 적다.
이는 SIDA가 픽셀 단위 아티팩트보다 의미적 수준의 조작 단서에 더 의존한다는 걸 시사한다.

### 5.5 Generalization (Table 5)

SID-Set에서만 잘 되면 데이터셋 과적합일 수 있다.
논문은 완전히 다른 외부 벤치마크인 DMimage 데이터셋에서 SIDA를 테스트해서 일반화 능력을 검증한다.
비교 대상 모델들은 모두 원래 사전학습 가중치와 하이퍼파라미터 그대로 사용했고, SIDA가 가장 높은 성능을 달성했다.

![[image-8-x53-y560.png]]
> _Table 5. DMimage 벤치마크에서 탐지 성능 비교._

SID-Set으로 학습한 SIDA가 전혀 다른 데이터셋에서도 SOTA를 달성했다는 게 핵심이다.
특히 AntifakePrompt가 두 번째로 높은 성능인데, 이것도 VLM 기반 모델이라는 점에서 VLM 계열이 기존 CNN 기반 탐지 모델들보다 일반화 능력이 전반적으로 뛰어남을 보여준다.


### 5.6 Ablation Study (Table 6)

Attention Module이 실제로 효과가 있는지 검증하기 위해 두 가지 변형을 실험했다.
Attention Module을 완전히 제거한 버전(w/o Attention)과, Attention 대신 FC Layer로 대체한 버전(FC)이다.

![[image-8-x57-y421.png]]
> _Table 6. Attention Module 유무에 따른 성능 비교._

FC와 w/o Attention 모두 SIDA 대비 Detection과 Localization 성능이 하락한다.
특히 FC로 대체했을 때도 성능이 떨어지는 게 중요한데, 단순히 $h_{det}$와 $h_{seg}$의 차원을 맞춰서 섞는 것만으로는 부족하다는 걸 의미한다. $h_{det}$가 Query가 되어 $h_{seg}$에서 관련 정보를 선택적으로 끌어오는 Attention의 구조 자체가 핵심이라는 증거다.

### 5.7 Qualitative Results (Figure 6)

![[image-8-x309-y274.png]]
> _Figure 6. SIDA의 시각적 결과. (a) 성공 사례: 원본 이미지에서 조작된 영역을 빨간 마스크로 정확하게 표시. (b) 실패 사례: Ground Truth 마스크(흑백)와 SIDA가 예측한 마스크가 불일치._

성공 사례에서는 object replacement와 partial tampered 이미지 모두에서 조작 영역을 정확하게 찾아낸다.

실패 사례는 두 종류다 — 조작 영역을 아예 탐지하지 못해 마스크 출력이 없는 경우, 그리고 마스크를 출력하긴 했으나 정답 영역과 많이 다른 경우.

논문은 이를 tampered 학습 데이터의 절대량 부족과, 매우 미세하거나 복잡한 조작에 대한 정밀도 한계로 분석한다.

---

## 6. Conclusion

### 6.1 기여 요약

이 논문의 기여는 두 가지다.

첫째, 소셜미디어 특화 딥페이크 탐지 데이터셋 **SID-Set** — Real/Synthetic/Tampered 각 10만 장씩 총 30만 장으로, Detection/Localization/Explanation 세 종류의 정답 레이블을 모두 갖춘 현재까지 가장 크고 포괄적인 데이터셋이다.

둘째, **SIDA** — 탐지, 위치 추정, 텍스트 설명을 하나의 파이프라인으로 수행하는 VLM 기반 프레임워크로, SID-Set과 외부 벤치마크 모두에서 SOTA 성능을 달성했다.


### 6.2 한계점

논문은 세 가지 한계를 언급한다.

**한계 1 — 데이터셋 규모.**
SID-Set이 30만 장 규모지만, 실제 소셜미디어 환경의 복잡성을 완전히 커버하기엔 여전히 부족하다. 데이터 규모 확장이 향후 과제다.

**한계 2 — 데이터 편향.**
Synthetic 이미지를 FLUX 하나로만 생성했기 때문에 데이터 편향(skew)이 잠재적으로 존재한다.
실험에서 크게 드러나진 않았지만, 다양한 생성 모델로 만든 가짜 이미지가 섞인 다른 벤치마크에서는 성능이 저하될 가능성이 있다.
3절에서 FLUX를 선택한 이유가 "전문가 블라인드 테스트에서 가장 현실적인 이미지"였는데, 퀄리티와 다양성 사이의 트레이드오프가 여기서 한계로 돌아온 셈이다.

**한계 3 — Localization 정밀도.**
SIDA가 Localization에서 SOTA를 달성했지만, IoU 43.8%라는 수치는 여전히 놓치는 조작 영역이 많다는 뜻이다.
특히 매우 미세한 조작이나 복잡한 장면에서 정밀도가 떨어진다. 5.7절의 실패 사례가 이를 직접 보여준다.

