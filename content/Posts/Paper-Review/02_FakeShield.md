---
title: "FakeShield: 멀티모달 LLM 기반 설명 가능한 이미지 위조 탐지 리뷰"
date: 2026-05-17
draft: false
---

> [!info] PAPER INFO
> **Title:** FakeShield: Explainable Image Forgery Detection and Localization via Multi-modal Large Language Models
> **Authors:** Xu et al.
> **Year / Venue:** 2025 · ICLR 2025
> **Links:** [arXiv](https://arxiv.org/abs/2410.02761) · [OpenReview](https://openreview.net/forum?id=pAQzEY7M03) · [GitHub](https://github.com/zhipeixu/FakeShield)

## 들어가며

이번 리뷰 포스트도 이전 [[01_SIDA|SIDA]] 논문과 같이 XAI 서베이 프로젝트 일환으로 준비한 논문 리뷰다. 리뷰노트 자체는 2주 전에 작성했지만, 중간고사 끝나고 일정이 너무 바빠 업로드가 늦어졌다...

FakeShield는 이미지가 조작됐는지 탐지하고, 조작 위치를 픽셀 마스크로 찾고, 왜 가짜인지까지 텍스트로 설명하는 모델을 제안한다. 1차 발표에서 다룬 SIDA와 같은 explainable IFDL 문제를 다루지만, 한 모델로 통합한 SIDA와 달리 task를 두 모듈로 나눈다는 점이 다르다.

이번 리뷰노트의 경우, 마지막에 논문을 읽고 난 후의 개인적 소감과 비평까지 작성해봤다.

---

## 1. Introduction

이 논문은 **IFDL**(Image Forgery Detection and Localization), 이미지가 조작되었는지 판단하고 조작 영역을 찾아내는 task를 한 단계 확장하려는 시도다. 기존 IFDL에 "왜 그렇게 판단했는지"라는 설명까지 함께 요구하는 것, 이것이 논문이 새로 정의하는 **e-IFDL**(explainable IFDL) task이고, 이 task를 수행하는 모델이 **FakeShield**다.

### 1.1 왜 지금 이 문제가 중요한가

이 **설명 가능성(explainable)** 확장이 왜 필요한지는, 최근 이미지 조작 기술이 어디까지 왔는지에서 출발한다.

특히 diffusion 기반 inpainting 같은 AIGC(AI Generated Content) editing 도구는 원본 이미지의 일부 영역만 거의 흔적 없이 다시 그려 넣을 수 있게 됐다. 조작 영역이 주변과 매끄럽게 섞여 사람 눈에도 의심스럽지 않다. 거짓 정보를 진짜 사진 안에 자연스럽게 심어둘 수 있다는 뜻이고, 가짜뉴스나 법적 증거 같은 맥락에서 이 신뢰성 손상은 가벼운 문제가 아니다.

이미지 진위 판별의 사회적 비중은 그만큼 커지는데, 본 논문은 이를 담당해 온 IFDL 분야 자체에 두 가지 한계가 있다고 말한다.

---

### 1.2 기존 IFDL의 두 가지 한계

![[image-2-x98-y551.png]]
> _Figure 1. 기존 IFDL 프레임워크(a)와 FakeShield의 explainable IFDL 프레임워크(b) 비교. 기존 방법은 detection 결과와 tampered area mask만 출력하지만, FakeShield는 판단 근거 설명과 multimodal 인터랙션까지 함께 제공한다._

==한계 1. Black-box==

Figure 1(a)의 conventional IFDL 모델은 detector와 locator를 거쳐 두 가지를 출력한다.

- 조작 여부 **confidence**
- tampered area mask

가짜인지 여부를 알려주고 어디가 가짜인지도 함께 표시해준다. 그러나 기존 IFDL 모델의 정확도가 만족스러운 수준이 아니기 때문에, 모델 출력만 보고 판단을 끝낼 수 없고 결국 사람이 다시 검증해야 한다.

문제는 그 검증 과정에서 모델이 **어떤 근거로 그렇게 판단했는지**를 알 수 없다는 점이다.
의심 영역을 받아도 어디부터 어떻게 봐야 할지 단서가 없으니, 검증 과정에서 어려움을 겪게 된다. 모델이 본 단서는 mask 안에 묻혀버린다. 이게 **explanation**을 핵심 출력으로 끌어올려야 하는 이유다.

==한계 2. Generalization==

위조 이미지(fake image)는 단일 종류가 아니다. 사용된 조작 도구와 방식에 따라 성격이 크게 다른데, 이 논문은 IFDL이 다뤄야 할 조작을 세 가지 도메인으로 묶어 정리한다.

- **PhotoShop**: copy-move, splicing, removal
- **DeepFake**: FaceApp 같은 얼굴 속성 조작
- **AIGC editing**: SD-inpainting 같은 부분 재생성

검출 모델 입장에서 이 세 도메인은 **분포가 다른 데이터**다.
한 도메인에서만 잘 작동하는 모델로는 부족하고, 학습 때 본 도메인을 넘어 다른 도메인에서도 안정적으로 작동하는 능력이 필요하다. 이 능력이 **generalization**이고, 두 번째 한계가 가리키는 지점이다.

그런데 기존 IFDL 방법은 보통 한 도메인만 다루도록 설계되어, 다른 도메인에서는 성능이 떨어진다. 그렇다고 한 모델로 세 도메인을 동시에 학습시키면 도메인 간 학습 신호가 충돌해 어느 쪽도 제대로 못 잡는 상황이 벌어진다. 논문은 이를 data domain conflict라고 부른다.

> 같은 "Fake" 라벨이라도 PS와 DeepFake, AIGC는 서로 다른 종류의 흔적으로 가짜가 된다. 한 모델이 셋을 동시에 학습하면 어디에 집중해야 할지 결정하지 못하고, 결국 어느 도메인에도 안정적으로 작동하지 못한다.

실제 사용 환경에서는 이 문제가 더 까다로워진다. 의심 이미지를 받았을 때 그게 어떤 도메인인지 미리 알 수 없다. 도메인을 모르면 어떤 모델을 써야 할지도 결정할 수 없는데, 그렇다고 한 모델로 다 처리하면 위 충돌이 생긴다.

이 두 한계, **Black-box**와 **Generalization**이 FakeShield가 풀려는 두 축이다.

---

### 1.3 e-IFDL: Black-box에 대한 답

논문은 두 한계 중 첫 번째(Black-box)에 대응하기 위해 task 자체를 새로 정의한다.
**e-IFDL** (explainable IFDL)은 기존 IFDL의 두 출력에 "왜 그렇게 판단했는지"를 설명하는 자연어 출력을 더한 task다.

|출력|의미|
|---|---|
|Authenticity judgment|조작 여부 판단|
|Tampered area mask|조작 영역 mask|
|**Judgment basis**|왜 그렇게 판단했는지에 대한 자연어 설명 (NEW)|

결국 추가되는 게 이 세 번째 출력이다. 단순히 "fake입니다"라고 답하는 게 아니라, 모델이 어떤 단서를 보고 그렇게 판단했는지 풀어내야 한다. 논문은 이 설명이 두 층위의 단서를 모두 담아야 한다고 본다.

1. Pixel-level artifact: object edge, resolution consistency 같은 저수준 시각 흔적
2. Image-level semantic error: 조명 방향, 원근 관계, 물리 법칙 위반 같은 의미 수준 이상함

이미지 위조는 픽셀만 봐서도, 장면 상식만 봐서도 잡히지 않는다. 두 층위를 함께 봐야 한다.

이 설명 가능성을 더한 task는 당연히 입력으로 이미지와 prompt, 그리고 출력은 자연어 설명인 text가 될 것이다. 즉, text, image to text 모델이 필요한 것인데, 여기서 **M-LLM** (Multimodal Large Language Model) 개념이 등장한다. "조명 방향이 안 맞는다", "경계 해상도가 다르다" 같은 관찰을 자연어 설명으로 만들 수 있는 모델이 M-LLM에 해당한다.

다만 M-LLM 도입 자체는 Black-box에 대한 방향을 잡은 것일 뿐, 두 번째 한계인 Generalization은 별도의 설계가 필요하다. 데이터와 모델 양쪽에서 두 한계를 함께 풀어가야 한다.

---

### 1.4 두 기여: MMTD-Set과 FakeShield

논문이 내놓는 기여는 데이터와 모델 두 갈래다. 둘 다 두 가지 한계(Black-box와 Generalization)를 동시에 겨냥하도록 설계됐다.

==MMTD-Set: 설명 학습을 위한 데이터셋==

M-LLM에게 "왜 가짜인지 설명하라"고 학습시키려면 **텍스트 정답 레이블**이 필요하다. 기존 IFDL 데이터셋은 image와 mask까지만 갖고 있어서 이 학습이 불가능하다.

논문은 **GPT-4o**를 annotator로 활용해 image-mask-description 삼중항을 만들고, 이를 **MMTD-Set** (Multi-Modal Tamper Description dataSet)이라 부른다.

이 데이터셋으로 두 한계에 대해 다음과 같이 기여한다:

- **Black-box 해결**: 설명 학습용 텍스트 레이블을 데이터셋 차원에서부터 제공
- **Generalization 해결**: PhotoShop / DeepFake / AIGC editing 세 도메인을 분리해 구성하고, GPT-4o에 도메인별로 다른 prompt를 주어 도메인 특성에 맞는 설명을 생성

==FakeShield: 두 모듈 파이프라인==

모델은 두 모듈로 분리된다.

- **DTE-FDM** (Domain Tag-guided Explainable Forgery Detection Module): 이미지를 받아 detection 결과, 위치 설명, 판단 근거를 텍스트로 생성
- **MFLM** (Multi-modal Forgery Localization Module): DTE-FDM의 텍스트 출력을 입력으로 받아 픽셀 mask를 생성

두 한계에 대해 다음과 같이 기여한다:

- **Black-box 해결**: DTE-FDM이 M-LLM 기반으로 자연어 설명을 생성한다. 이 설명은 사용자에게 보여주는 출력에 그치지 않고 그대로 MFLM의 입력이 되어 mask 생성을 이끈다.
- **Generalization 해결**: DTE-FDM 이름의 "Domain Tag-guided" 부분이 그 장치다. 이미지를 LLM에 넣기 전에 "이건 어떤 조작 도메인으로 봐야 한다"는 도메인 태그를 먼저 만들어 함께 넣어주는 구조로, data domain conflict를 완화한다.

---

## 2. Construction of MMTD-Set

MMTD-Set은 두 한계를 데이터 차원에서 같이 풀려는 시도다. Black-box를 다루려면 모델이 "왜 가짜인지"를 학습할 텍스트 GT가 필요한데, 사람이 수십만 장에 forensic report를 직접 써주는 건 비현실적이다. Generalization을 다루려면 학습 데이터가 도메인 한쪽으로 쏠리지 않아야 한다.

논문은 GPT-4o를 annotator로 써서 텍스트 GT를 자동 생성하고, 세 도메인을 분리해 균형 있게 수집하는 식으로 두 문제를 함께 푼다. 결과물이 image-mask-description 삼중항으로 이뤄진 **MMTD-Set** (Multi-Modal Tamper Description dataSet)이다.

이 절은 MMTD-Set을 두 축으로 들여다본다.

- **데이터 수집 축**: 어떤 도메인에서, 어떤 소스로, 얼마나 모았는가
- **텍스트 생성 축**: GPT-4o에 무엇을 주고, 어떻게 설명을 만들게 했는가

### 2.1 도메인별 데이터 수집

논문은 현실의 조작을 세 도메인으로 나눠서 수집한다. 도메인마다 소스와 생성 방식이 다르다.

| 도메인              | 세부 방식                        | 소스                         | 비고                |
| ---------------- | ---------------------------- | -------------------------- | ----------------- |
| **PhotoShop**    | copy-move, splicing, removal | CASIAv2, Fantastic Reality | 기존 IFDL 벤치마크에서 수집 |
| **DeepFake**     | FaceApp 기반 얼굴 속성 조작          | FFHQ + FaceApp             | DFFD 구성에 포함된 데이터  |
| **AIGC editing** | SD-inpainting 기반 부분 재생성      | COCO 베이스                   | 자체 생성             |

> [!info] 소스 데이터셋 정보
> - CASIAv2 / Fantastic Reality (FR): PhotoShop 기반 조작 이미지와 원본 쌍을 제공하는 기존 IFDL 표준 벤치마크.
> - **FFHQ**: NVIDIA가 공개한 고화질 실제 얼굴 데이터셋. 여기서는 DeepFake의 real face source.
> - **FaceApp**: 수염, 헤어, 메이크업 등 얼굴 속성을 바꾸는 모바일 앱. FFHQ 얼굴에 적용해 fake face를 만든다.
> - **COCO**: 일상 사물 사진과 객체 위치 레이블이 있는 데이터셋. AIGC editing의 base image source.

AIGC editing은 자체 생성이다. COCO에서 일부 객체 영역을 SAM으로 추출한 뒤 SD-inpainting으로 다시 그린 식이다.

훈련셋 기준 샘플 수는 대략 다음과 같다.

- Real: ~54,000장 (Fantastic Reality + CASIAv2 + FFHQ + COCO)
- PS Fake: ~24,500장
- DeepFake: ~7,300장
- AIGC Fake: ~20,000장

![[Pasted image 20260504053943.png]]
> *Table 7. training and evaluation MMTD-Set 요약표*

여기서 짚어둘 점은 MMTD-Set이 다루는 fake의 정의다. 세 도메인 모두 원본 이미지의 일부가 조작된 경우만 포함하고, 완전히 새로 생성된 synthetic image는 다루지 않는다. Localization task 특성상 "어디까지가 원본이고 어디부터가 조작인가"라는 경계가 필요한데, 전체가 생성된 이미지는 이 경계 자체가 없기 때문이다.

데이터 수집은 여기까지다. 도메인 셋으로 분리해 균형 있게 모은 것 자체가 Generalization을 데이터 차원에서 푸는 첫 단계인 셈이다.

### 2.2 GPT-4o로 텍스트 GT 만들기

수집한 image-mask 쌍을 GPT-4o에 던져서 텍스트 설명을 받아내는 게 다음 단계다. 이 과정에 두 가지 설계 결정이 들어간다.

![[image-4-x101-y510.png]]

> _Figure 2. MMTD-Set 구축 프로세스. 세 도메인의 tampered image와 대응 real image를 모은 뒤, 도메인별로 다른 prompt를 GPT-4o에 주입해 detection result, localization description, judgment basis를 생성한다. 출력은 expert proofreading을 거쳐 MMTD-Set에 들어간다._

==결정 1. mask를 함께 준다==

GPT-4o가 받는 입력은 tampered image 하나가 아니라 image와 forgery mask 쌍이다. 왜 mask까지 같이 주냐면, mask 없이 이미지만 주면 GPT-4o가 조작 위치를 스스로 추정해야 하고, 이 추정이 부정확하면 그 뒤의 artifact 분석도 어긋나기 때문이다.

단순하게 생각하면, GPT-4o는 조작 영역을 새로 찾는 detector가 아니라 이미 주어진 mask를 기준으로 설명을 만드는 annotator인 셈이다.

==결정 2. 도메인별로 다른 prompt를 준다==

세 도메인은 남기는 artifact의 종류가 다르다.

- **PhotoShop**: edge artifact, 해상도 차이, 조명 불일치 같은 픽셀 단위 흔적 + 물리 법칙·상식 위반 같은 이미지 수준의 의미 오류
- **AIGC editing**: 텍스트 생성이 부정확해 깨진 글자나 기호가 조작 영역에 나타나는 식의 단서
- **DeepFake**: 얼굴 비대칭, 입/눈 주변의 국소 blur 같은 얼굴 특화 단서

동일한 질문을 던지면 도메인 간 차이를 잡지 못한 일반론적 답이 나오기 쉽다. 그래서 도메인별로 어떤 단서에 집중할지 명시한 전용 prompt를 따로 설계해서 주입한다.
결과적으로 PS 조작에는 edge와 lighting 중심 설명이, DeepFake에는 facial asymmetry 중심 설명이 붙는다.

수집 단계에서 도메인을 셋으로 분리한 데 더해, 텍스트 생성 단계에서도 도메인별 cue가 살아나게 prompt를 다르게 둔다. Generalization을 데이터 안에서 한 번 더 챙기는 셈이고, 텍스트 GT 자체가 Black-box 대응의 본체다.

==Real sample 처리==

Real sample은 두 가지가 다르다.

- **mask 없음**: 조작 영역이 없으니 GPT-4o에 mask를 주지 않는다. 입력은 이미지 + authenticity 확인용 prompt만.
- **text GT의 성격**: "어디가 어떻게 조작됐는가"가 아니라 "왜 authentic image로 볼 수 있는가". 조명, 그림자, edge, perspective 같은 단서가 자연스럽고 일관되어 조작되지 않았다고 보는 식의 근거가 들어간다.

레이블 구성을 정리하면 다음과 같다.

| 샘플       | class label | mask       | text GT                             |
| -------- | ----------- | ---------- | ----------------------------------- |
| **Fake** | fake        | 조작 영역 mask | 조작 위치, 내용, artifact, judgment basis |
| **Real** | real        | 없음         | authentic으로 판단하는 근거                 |

> [!note] Real이 별도 도메인은 아니다
> MMTD-Set의 Real은 PS / DeepFake / AIGC와 나란히 놓이는 네 번째 도메인이 아니라, 각 조작 도메인에 대응되는 negative sample이다. Fantastic Reality / CASIAv2의 real image가 PS에 대응, FFHQ가 DeepFake에 대응, COCO가 AIGC에 대응하는 식이다.
> 
> 이 구분이 모델 쪽에서 DTG(Domain Tag Generator)를 이해할 때 한 번 더 의미를 가진다. DTG는 Real/Fake를 가르는 분류기가 아니라 PS/DeepFake/AIGC 3-way classifier이기 때문에, Real sample을 어떻게 다루는지가 본문만으로는 명확하지 않다.

### 2.3 데이터셋이 모델 설계까지 가이드한다

MMTD-Set의 PS / DeepFake / AIGC 도메인 구분은 단순 metadata가 아니다. 모델 쪽에서도 DTG의 분류 라벨로 그대로 재사용된다. 즉 MMTD-Set의 도메인 세 가지 분할이 Generalization을 데이터 차원에서 푸는 대응이라면, 모델 쪽 DTG는 같은 분할을 모델 차원에서 다시 활용하는 장치다.

데이터와 모델이 같은 도메인 정의를 공유하는 셈인데, 이 일관성이 뒤의 detection 결과에서 일반화 성능과도 직접 연결된다.

---

## 3. Overall Framework of FakeShield

![[image-5-x105-y430.png]]
> _Figure 3. FakeShield 파이프라인. 입력 이미지 $I_{ori}$가 DTE-FDM을 거쳐 텍스트 출력 $O_{det}$를 생성하고, MFLM이 $O_{det}$와 이미지 정보를 결합해 최종 mask $M_{loc}$를 생성한다._

MMTD-Set이 두 한계를 데이터 차원에서 풀려는 답이었다면, FakeShield는 그 데이터를 받아 e-IFDL을 실제로 풀어내는 모델 차원의 답이다.

### 3.1 어떻게 풀 것인가

==문제를 단순하게 보기==

아키텍처를 들여다보기 전에 한 번 거리를 두고 보자.
이 논문이 풀려는 건 결국 IFDL에 설명을 추가한 task(e-IFDL)다. 출력 세 가지를 다시 짚으면 다음과 같다.

- Authenticity judgment: 조작 여부
- Tampered area mask: 조작 영역 픽셀 mask
- **Judgment basis**: 자연어 판단 근거

이 세 가지를 어떻게 만들어낼 것인가. 단순하게 생각해보자.

> *설명(judgment basis)을 만드는 일은, 사실 LLM을 가져오는 것만으로 큰 틀에서는 해결된다.*

LLM은 입력 텍스트로부터 출력 텍스트를 생성하는 모델이고, 이미 강력한 자연어 생성 능력을 가지고 있다. M-LLM을 쓰면 이미지도 입력으로 받을 수 있다.

그러면 진짜 문제는 다음으로 다시 재정의해볼 수 있다.

> *"LLM에게 **무엇을 입력으로 넣어야** IFDL에 맞는 설명이 나오는가"*

LLM에 들어가는 입력 후보를 정리해보면 이렇게 된다.

- **이미지**: 분석 대상이니 당연히 들어간다. M-LLM이라면 image token 형태로.
- **사용자 instruction**: "이 이미지가 조작됐는지 분석해달라" 같은 prompt. 이것도 당연히 필요하다.
- 추가로 줄 수 있는 게 있다면?: 여기서 method의 변주 point를 생각해볼 수 있다.

==변주 Point: 사전 지식의 제공==

논문은 여기서 **도메인 정보**를 추가로 주입한다.
*data domain conflict*, 즉 PS / DeepFake / AIGC가 남기는 단서가 서로 달라 생기는 문제에 대한 대응이다. 이미지를 보고 "이건 PS 조작으로 의심된다" 같은 도메인 힌트를 짧은 텍스트로 만들어서 LLM 입력에 함께 넣어주면, LLM은 그 도메인 특유의 단서에 집중해서 분석을 풀어낼 수 있다.

이 도메인 힌트를 만드는 게 **DTG** (Domain Tag Generator)다. 이미지를 받아 PS / DeepFake / AIGC 중 하나로 분류하는 단순한 3-way classifier에 가깝다.

여기서 알아야 할 것은, DTG가 제공한 도메인 힌트와 함께 LLM이 출력을 만들면, 그 출력 안에 이미 detection 결과가 자연스럽게 포함된다. "이 이미지는 조작된 것으로 판단되며, 조작 영역은 ..." 같은 식의 텍스트로 나오기 때문이다. 즉, detection을 별도 분류 head로 처리할 필요가 없고, LLM이 자연어로 풀어낸 답 안에서 함께 해결된다.

요약하면, e-IFDL의 세 출력 중 처음 두 가지(detection, explanation)는 LLM 하나로 처리할 수 있는 task고, FakeShield는 그 LLM에 도메인 힌트라는 추가 입력을 더해 정확도를 끌어올리는 식으로 접근한다.

이 묶음이 **DTE-FDM**(Domain Tag-guided Explainable Forgery Detection Module)이고, DTG와 LLM 두 컴포넌트로 구성된다.

남은 건 localization이다.

### 3.2 Localization은 어떻게

이미지와 prompt를 받아 mask를 픽셀 단위로 그리는 일에는 SAM이 강력하다.
하지만 SAM이 받는 prompt는 LLM과 달리 점이나 박스 같은 짧고 직접적인 신호다.

이 구도에서 변주 지점은 prompt를 무엇으로 줄 것인가다. 이미지는 원본을 그대로 넣으면 되니까 고민할 필요가 없다.

==SAM의 prompt: 무엇을 입력으로?==

DTE-FDM이 만든 텍스트 출력 $O_{det}$를 다시 생각해 보자.
이 텍스트 안에는 이미 "이미지 어디가 조작됐는지", "어떤 단서로 그렇게 판단했는지" 같은 의미 정보가 풍부하게 담겨 있을 것이다. LLM이 이미지와 도메인 힌트를 종합해서 자연어로 풀어낸 결과물이기 때문이다.

즉, 이 정보를 재활용하여 SAM에게 입력으로 제공할 수 있다면, SAM은 점이나 박스를 새로 만들어 주는 대신, $O_{det}$에 담긴 의미를 그대로 활용해서 mask를 그리게 될 것이다.

그러나 DTE-FDM의 출력은 LLM이 만든 긴 텍스트이고, SAM은 짧은 prompt를 받도록 설계되어 있다.
그래서 둘 사이에 변환이 필요하다.

이 변환을 담당하는 게 **TCM**(Tamper Comprehension Module)이다.
TCM은 LLM 기반 모듈로, $O_{det}$에 담긴 긴 설명에서 mask 생성에 필요한 의미 정보를 뽑아 SAM이 받을 수 있는 prompt embedding 형태로 압축한다.
변환을 담당하는 모듈도 LLM으로 설계한 이유는, 이 변환 자체가 긴 텍스트를 이해하고 핵심을 추출하는 일이기 때문이다.

이 묶음이 **MFLM**(Multi-modal Forgery Localization Module)이고, TCM과 SAM 두 컴포넌트로 구성된다.


### 3.3 정리하면 이렇게 된다

지금까지의 사고를 모델 구조로 옮기면 다음과 같다.

```
FakeShield
├── DTE-FDM (detection + explanation)
│   ├── DTG: 도메인 힌트 생성
│   └── LLM: 설명 텍스트 생성
│
└── MFLM (localization)
    ├── TCM: O_det → SAM용 prompt embedding
    └── SAM: 픽셀 mask 생성
```

각 task가 어떤 컴포넌트의 어떤 능력으로 풀리는지 정리하면 이렇다.

| 출력                    | 담당 모듈   | 핵심 컴포넌트 | 활용한 능력                   |
| --------------------- | ------- | ------- | ------------------------ |
| Authenticity judgment | DTE-FDM | LLM     | 자연어 생성 안에 자연스럽게 포함       |
| Judgment basis        | DTE-FDM | LLM     | 도메인 힌트를 받아 단서를 분석        |
| Tampered area mask    | MFLM    | SAM     | TCM이 변환한 prompt로 mask 생성 |

논문이 두 모듈을 별도로 놓는 이유도 이 표를 보면 알 수 있다.
위 두 task는 LLM의 자연어 생성 능력으로 풀리고, 아래 task는 SAM의 segmentation 능력으로 풀린다. 언어 이해와 시각적 분할은 성격이 다른 일이다. 논문은 이 둘을 한 모델에 동시에 학습시키면 서로 간섭해서 양쪽 다 충분히 학습되지 않는다고 본다. 그래서 task 성격에 맞는 모델을 각각 가져다 붙이고, 사이를 텍스트($O_{det}$)와 prompt embedding으로 연결한다.

이 연결 방식이 FakeShield의 특징이다. DTE-FDM의 출력은 사용자에게 보여주는 최종 답이면서, 동시에 MFLM의 입력이기도 하다. Explanation이 단순한 부가 출력이 아니라 다음 단계의 의미적 가이드로 재사용된다는 것, 이 발상이 FakeShield의 핵심 설계라고 봐도 될 것 같다.

---

## 4. DTE-FDM과 MFLM 상세

두 모듈이 각각 어떤 task를 맡고 왜 둘로 나뉘는지는 큰 그림으로 정리했다. 이제 각 모듈 안으로 들어가, 수식과 함께 동작을 따라가보자.

### 4.1 DTE-FDM

DTE-FDM의 task는 단순하다. 이미지를 받아서 detection 결과 + 조작 위치 설명 + 판단 근거를 텍스트로 출력하는 것이다. 이걸 위해 DTG와 LLM 두 컴포넌트가 협력한다.

==DTG가 하는 일==

DTG는 이름이 generator지만, 실제로는 **단순 이미지 분류기**에 가깝다.
입력 이미지 $I_{ori}$를 받아 PS / DeepFake / AIGC 중 어느 도메인의 조작인지 판별하고, 그 결과를 LLM이 읽을 수 있는 짧은 텍스트로 변환한다.

```
"This is a suspected {PS/DeepFake/AIGC} tampered picture."
```

이 한 줄이 $T_{tag}$가 된다. 이미지를 한 번 분류해서 정해진 템플릿에 끼워넣는 것뿐이라 별다른 텍스트 생성 능력이 필요하지 않다. 학습도 단순 3-class CE로 끝난다.

==수식 (1): LLM에 들어가는 두 가지 정보==

같은 이미지 $I_{ori}$에서 LLM에 들어갈 두 가지 정보가 만들어진다.

$$
T_{tag} = \mathcal{G}_{dt}(I_{ori}), \qquad T_{img} = \mathcal{F}_{proj}(\mathcal{F}_{enc}(I_{ori})) \tag{1}
$$

- $T_{tag}$: DTG $\mathcal{G}_{dt}$가 만든 도메인 힌트 텍스트.
- $T_{img}$: 이미지를 LLM이 처리할 수 있는 image token으로 변환한 결과. $\mathcal{F}_{enc}$가 ViT 기반 image encoder이고, $\mathcal{F}_{proj}$가 ViT 출력을 LLM 임베딩 공간에 맞추는 projection layer다.

$T_{img}$를 만드는 이 경로는 LLaVA 계열 M-LLM의 표준 구성이다. FakeShield의 베이스 모델이 LLaVA 계열이라 이 부분은 그대로 가져왔다.

==수식 (2): LLM이 출력을 만든다==

$$
O_{det} = \mathrm{LLM}(T_{ins}, T_{tag} \mid T_{img}) \tag{2}
$$

LLM이 받는 입력은 세 가지다.

- $T_{ins}$: 사용자 instruction. 예: "Can you identify manipulated areas in the photograph?"
- $T_{tag}$: DTG가 만든 도메인 힌트.
- $T_{img}$: 이미지 token.

이 세 입력을 받아 LLM이 자연어로 출력 $O_{det}$를 생성한다. $O_{det}$ 안에는 e-IFDL이 요구하는 출력이 다 들어 있다.

```
O_det 예시:
  Detection : "The picture has been tampered with"
  Location  : "The tampered area is located in the upper half..."
  Judgment  : "The lighting is inconsistent..."
```

여기까지가 DTE-FDM이다. LLM 하나가 detection 결과, 조작 위치 설명, 판단 근거를 자연어 $O_{det}$ 안에 함께 담아내고, DTG는 그 LLM이 도메인에 맞는 분석을 하도록 힌트를 주는 보조 장치다. e-IFDL의 출력 중 아직 안 풀린 건 픽셀 단위 mask 하나뿐이고, 그게 다음 모듈의 일이다.

---

### 4.2 MFLM

MFLM이 맡은 일은 mask를 그리는 것 하나다. SAM을 그냥 가져다 붙이는 게 아니라, DTE-FDM이 만든 텍스트 $O_{det}$를 SAM이 쓸 수 있게 연결하는 것이 이 모듈의 과제다.

==TCM이 하는 일==

SAM이 받는 prompt는 점·박스 같은 짧은 신호인 반면, $O_{det}$는 긴 자연어 설명이다. 이 간극을 메우는 게 TCM의 역할이다.

TCM은 LLM을 encoder로 쓴다. image token $T_{img}$와 텍스트 설명 $O_{det}$를 함께 받아, 출력 시퀀스 안에 `<SEG>`라는 특수 토큰이 등장하도록 만든다. 그리고 그 `<SEG>` 위치의 last-layer hidden state를 뽑아 SAM에 넘긴다. 긴 텍스트에 담긴 의미가 이 hidden state 하나로 압축되는 셈이다.

이 `<SEG>` 토큰 방식은 LISA에서 가져왔다. LISA는 reasoning segmentation을 위해 M-LLM에 `<SEG>` 토큰을 추가하고 그 hidden state를 SAM decoder의 prompt로 쓰는데, 논문도 이 방식을 그대로 따른다. 입력이 일반 사용자 질문이 아니라 DTE-FDM이 만든 $O_{det}$라는 점만 다르다.

> [!info] LISA (Lai et al., CVPR 2024)
> *Reasoning Segmentation via Large Language Model*. 객체 이름을 직접 주는 대신, 추론이 필요한 자연어 질의를 이해해서 해당 영역을 분할하는 reasoning segmentation task를 제안한 연구다. M-LLM 어휘에 `<SEG>` 토큰을 추가하고, 그 토큰의 hidden state(embedding)를 SAM이 디코딩해 mask를 만드는 "embedding-as-mask" 방식을 처음 도입했다.
> arXiv: https://arxiv.org/abs/2308.00692

==수식 (3): MFLM의 흐름==

$$
E_{mid} = \mathcal{S}_{enc}(I_{ori}), \quad h_{\texttt{<SEG>}} = \text{Extract}(\mathcal{C}_{t}(T_{img}, O_{det}))
$$

$$
M_{loc} = \mathcal{S}_{dec}(E_{mid} \mid h_{\texttt{<SEG>}}) \tag{3}
$$


아래 내용을 순서대로 따라가며 MFLM의 전체 흐름을 잡아보자.

**1. $E_{mid} = \mathcal{S}_{enc}(I_{ori})$**

원본 이미지를 SAM Encoder $\mathcal{S}_{enc}$에 통과시켜 픽셀 단위 시각 특징 $E_{mid}$를 얻는다. SAM ViT는 frozen으로 두고 사전학습된 표현을 그대로 활용한다. mask를 그릴 때 픽셀 위치 정보가 필요한데, 이 경로가 그걸 담당한다.

**2. $h_{<\text{SEG}>} = \text{Extract}(\mathcal{C}_t(T_{img}, O_{det}))$**

$\mathcal{C}_t$가 TCM, $\text{Extract}(\cdot)$가 출력 시퀀스에서 `<SEG>` 토큰 위치의 last-layer hidden state를 뽑는 연산이다.

TCM이 하는 일은 새로운 설명을 길게 생성하는 게 아니다. 학습 시 TCM의 출력 텍스트는 "It is `<SEG>`." 같은 짧은 고정 템플릿으로 맞춰진다. 중요한 건 출력 안에 `<SEG>` 토큰이 등장하게 만드는 것이고, 그 위치의 hidden state가 mask 생성에 필요한 의미를 담는다.

다만 이 hidden state는 LLM 쪽 차원이라 SAM Decoder가 받는 차원과 맞지 않는다. 그래서 사이에 MLP projection layer가 들어가 차원을 맞춘 $h_{<\text{SEG}>}$를 만든다.

**3. $M_{loc} = \mathcal{S}_{dec}(E_{mid} \mid h_{<\text{SEG}>})$**

SAM Decoder $\mathcal{S}_{dec}$가 두 입력을 받아 최종 mask를 그린다. $E_{mid}$는 어디에 픽셀이 있는지 정보를 주고, $h_{<\text{SEG}>}$는 그중 어디를 mask로 칠해야 하는지 의미적 가이드를 준다. 둘이 결합되어 최종 픽셀 mask $M_{loc}$가 나온다.

==두 경로로 처리되는 이미지==

MFLM의 수식을 따라가다 보면, 같은 이미지가 두 경로로 들어간다는 게 보인다.

```
I_ori
  ├── SAM Encoder (frozen)        → E_mid : 픽셀 단위 시각 특징
  └── Image Encoder + Projection  → T_img : LLM이 이해하는 image token
                                           (O_det와 함께 TCM에 입력)
```

한쪽은 mask를 그릴 픽셀 특징을, 다른 쪽은 LLM이 텍스트와 함께 읽을 token 표현을 만든다. 같은 이미지를 다른 목적으로 두 번 보는 셈이다.

---

### 4.3 두 모듈을 묶어보면

DTE-FDM과 MFLM을 따로 따라가봤으니, 이제 둘을 나란히 놓고 보자.

| 모듈      | 입력                   | 핵심 컴포넌트         | 출력                  |
| ------- | -------------------- | --------------- | ------------------- |
| DTE-FDM | $I_{ori}$, $T_{ins}$ | DTG + LLM       | $O_{det}$ (텍스트)     |
| MFLM    | $O_{det}$, $I_{ori}$ | TCM (LLM) + SAM | $M_{loc}$ (픽셀 mask) |

표를 보면 두 모듈 모두 LLM을 핵심 컴포넌트로 둔다. DTE-FDM의 LLM은 자연어 설명을 생성하고, MFLM의 TCM 안 LLM은 그 설명을 다시 SAM용 prompt로 변환한다. 자연어 생성과 자연어 이해라는 LLM의 두 강점이 각 모듈에서 한 번씩 쓰이는 구조다.

이렇게 보면 FakeShield는 "LLM의 능력을 e-IFDL의 각 단계에 어떻게 끌어다 쓸 것인가"에 대한 하나의 답이다. 도메인 힌트도, 두 모듈 사이의 연결도, segmentation prompt도 전부 텍스트와 LLM을 매개로 이어진다.

---

## 5. 학습

지금까지 두 모듈의 동작을 봤다. 그럼 각 컴포넌트는 어떻게 학습되는가.

학습 전략의 큰 틀부터 잡아두면, 두 모듈을 **별도로 end-to-end 학습**한다. DTE-FDM을 먼저 학습시켜 $O_{det}$를 잘 만드는 모델을 얻고, 그다음 MFLM을 학습시킨다. 한 번에 묶어 동시에 학습하지 않는다.

두 모듈을 나눈 이유 자체가 task 성격이 달라 같이 학습하면 서로 간섭한다는 것이었다. 학습을 따로 가져가는 것도 그 연장선이다.

### 5.1 어디를 학습시키고 어디를 얼리는가

각 컴포넌트가 어떻게 학습되는지부터 정리해두자. FakeShield는 컴포넌트마다 학습 방식이 다르다.

| 모듈      | 컴포넌트          | 학습 방식          | 이유                                              |
| ------- | ------------- | -------------- | ----------------------------------------------- |
| DTE-FDM | DTG           | Full parameter | 새로 추가하는 분류기. 기존 사전학습 모델 없음.                     |
| DTE-FDM | LLM           | LoRA           | LLaVA-v1.5-13B 베이스. 사전학습된 언어 능력 유지하며 fine-tune. |
| DTE-FDM | Image Encoder | Frozen         | LLaVA의 ViT. 이미 좋은 시각 표현.                        |
| DTE-FDM | Projection ($\mathcal{F}_{proj}$) | Full parameter | ViT 출력을 LLM 임베딩 공간에 잇는 작은 FC layer. |
| MFLM    | TCM (LLM)     | LoRA           | DTE-FDM과 동일한 이유                                 |
| MFLM    | SAM Decoder   | LoRA           | SAM의 사전학습 segmentation 능력 활용                    |
| MFLM    | SAM Encoder   | Frozen         | SAM ViT. 픽셀 단위 시각 특징 추출에 이미 강함                  |

학습 방식이 셋으로 갈린다. DTG와 projection layer는 크기가 작아 full parameter로 학습한다. DTG는 새로 추가하는 분류기라 사전학습 가중치가 아예 없고, projection layer도 ViT 출력을 LLM 공간에 맞추는 작은 FC layer다.

LLM, TCM, SAM Decoder는 거대한 사전학습 모델을 베이스로 가져온 것들이다. 전체 파라미터를 다 업데이트하면 비용도 크고 기존 능력을 망가뜨릴 위험도 있어서 LoRA를 쓴다. Image Encoder와 SAM Encoder는 이미 좋은 시각 표현을 갖고 있어 frozen으로 둔다.

> [!info] LoRA가 하는 일
> LoRA(Low-Rank Adaptation)는 사전학습된 가중치 $W$를 그대로 두고, 작은 보조 행렬 두 개만 추가로 학습하는 방식이다.
> 
> $$
> W_{new} = W + \Delta W, \quad \Delta W = BA
> $$
> 
> $W$가 $d \times d$ 행렬이라면, $A$는 $r \times d$, $B$는 $d \times r$로 두고 ($r \ll d$) $A$와 $B$만 학습한다. $r$이 LoRA의 **rank**이고, 이 보조 행렬이 표현할 수 있는 변화의 크기를 결정한다.
> 
> 핵심 효과:
> 
> - **파라미터 수 대폭 감소**: $d^2$가 아니라 $2dr$만 학습. $r$이 $d$보다 훨씬 작으면 학습할 파라미터가 수백 배 적어진다.
> - **사전학습 능력 유지**: 원래 $W$를 건드리지 않으니 기존 언어 능력이나 시각 능력이 보존된다.
> 
> $\alpha$는 LoRA update의 scale을 조절하는 값이다. FakeShield는 두 모듈에 다른 rank를 쓴다.

| .          | DTE-FDM의 LLM | MFLM의 TCM/SAM |
| ---------- | ------------ | ------------- |
| LoRA rank  | 128          | 8             |
| LoRA alpha | 256          | 16            |
| alpha/rank | 2.0          | 2.0           |

rank 차이는 두 LLM이 맡은 **task 복잡도 차이**를 반영하는 것으로 보인다.
- DTE-FDM의 LLM은 detection 결과 + 위치 설명 + 판단 근거를 모두 포함하는 긴 텍스트를 생성해야 한다. 다양한 도메인의 다양한 단서를 자연어로 풀어내야 하니 표현해야 할 변화의 폭이 크다.
- 반면 MFLM의 TCM은 짧은 고정 템플릿 "It is `<SEG>`."를 출력하는 게 전부라, 표현해야 할 변화가 상대적으로 단순하다. 그래서 rank를 작게 가져간다.

두 경우 모두 alpha/rank 비율은 2.0으로 맞췄다.

### 5.2 DTE-FDM의 loss

DTE-FDM에서 학습되는 출력은 두 가지다. DTG가 만드는 도메인 태그 $T_{tag}$, 그리고 LLM이 만드는 텍스트 $O_{det}$. 둘 다 정답과의 cross-entropy로 학습한다.

$$
\ell_{det} = \ell_{ce}(\hat{O}_{det}, O_{det}) + \lambda \cdot \ell_{ce}(\hat{T}_{tag}, T_{tag}) \tag{4}
$$

> [!important] 이 논문의 hat 표기 주의
> 이 논문은 hat이 붙은 항을 ground truth로 쓴다. 보통 머신러닝 수식에서는 예측값에 hat을 붙이는 게 일반적인데, 이 논문은 반대다. $\hat{O}_{det}$, $\hat{T}_{tag}$, $\hat{M}_{loc}$ 모두 GT로 읽어야 한다.

두 항을 따로 보면:

**LLM 텍스트 생성 loss**: $\ell_{ce}(\hat{O}_{det}, O_{det})$

LLM이 GT 설명 $\hat{O}_{det}$를 잘 따라 쓰도록 거는 cross-entropy다. LLM 학습은 본질적으로 next-token prediction이라, 출력 시퀀스의 각 위치에서 다음에 올 정답 토큰의 확률이 높아지도록 학습된다. 그래서 이 loss는 "전체 텍스트의 의미가 비슷한가"가 아니라 "GT 시퀀스의 각 토큰을 순서대로 잘 예측하는가"를 본다. 텍스트 생성 task의 일반적인 학습 방식이다.

**DTG 분류 loss**: $\lambda \cdot \ell_{ce}(\hat{T}_{tag}, T_{tag})$

DTG는 텍스트를 생성하는 게 아니라 PS / DeepFake / AIGC 중 하나를 분류하는 분류기다. 그러니 일반적인 3-class cross-entropy를 쓴다.
분류 결과를 템플릿(`"This is a suspected {...} tampered picture."`)에 끼워넣는 건 학습 후 inference 시 일어나는 일이고, 학습 자체는 단순 분류기 학습이다.

$\lambda$는 두 loss의 비중을 조절하는 가중치다.

### 5.3 MFLM의 loss

MFLM에서 학습되는 출력은 두 가지다. TCM이 만드는 텍스트 $y_{txt}$, 그리고 SAM이 만드는 mask $M_{loc}$.

$$
\ell_{loc} = \ell_{ce}(\hat{y}_{txt}, y_{txt}) + \alpha \cdot \ell_{bce}(\hat{M}_{loc}, M_{loc}) + \beta \cdot \ell_{dice}(\hat{M}_{loc}, M_{loc}) \tag{5}
$$

세 항인데, 첫 번째와 나머지 둘이 성격이 다르다.

==y_txt는 O_det가 아니다==

수식 (5)의 $y_{txt}$를 $O_{det}$로 착각하기 쉬운데, 둘은 다른 텍스트다. $O_{det}$는 DTE-FDM LLM이 만든 긴 forensic report이고, $y_{txt}$는 TCM이 내는 짧은 prompt text("It is `<SEG>`.")다. TCM의 목적은 새 설명을 쓰는 게 아니라 `<SEG>` 토큰을 출력에 등장시키는 것이라, 정답 $\hat{y}_{txt}$도 짧은 고정 템플릿이다.

그래서 첫 번째 항 $\ell_{ce}(\hat{y}_{txt}, y_{txt})$는 (4)의 첫 항과 같은 LLM 텍스트 생성 CE지만, 정답 시퀀스가 훨씬 짧고 단순하다.

==BCE와 Dice를 함께 쓰는 이유==

$\ell_{bce}$는 픽셀별 binary cross-entropy다. mask의 각 픽셀에 대해 "조작/비조작"을 분류하는 셈이다. 이것만으로는 부족한 이유가 있다. **클래스 불균형**.

대부분의 조작 이미지에서 조작 영역은 전체 이미지의 작은 부분이다.

예를 들어 100만 픽셀 중 1만 픽셀만 조작 영역이라고 해보자. 모델이 모든 픽셀을 "조작 아님(0)"으로 찍어도, BCE는 99%의 픽셀을 맞췄으니 작은 값이 나온다. 학습이 됐다고 모델이 착각하는 상황이 생긴다.

Dice loss가 이 문제를 보완한다.

$$
\text{Dice} = \frac{2|A \cap B|}{|A| + |B|}, \qquad \ell_{dice} = 1 - \text{Dice}
$$

여기서 $A$는 예측 mask, $B$는 GT mask다. Dice 계수는 픽셀 하나하나의 정답 여부가 아니라 두 mask가 **얼마나 겹치는가**를 본다.

> [!info] Dice 계수 = F1 score
> 예측 mask $A$와 GT mask $B$를 "조작이라고 본 픽셀의 집합"으로 놓으면, $|A \cap B|$는 맞게 칠한 픽셀, $|A|$는 모델이 칠한 전체, $|B|$는 실제 조작 전체다. 여기서 두 지표가 나온다.
> - **Precision** $= |A \cap B| / |A|$ — 칠한 것 중 맞은 비율
> - **Recall** $= |A \cap B| / |B|$ — 맞춰야 할 것 중 잡아낸 비율
>
> Dice 계수 $\frac{2|A \cap B|}{|A|+|B|}$를 풀어쓰면 이 둘의 **조화평균**, 곧 **F1 score와 같은 식**이다. 조화평균은 산술평균과 달리 두 값 중 작은 쪽에 강하게 끌려간다. precision이 아무리 높아도 recall이 0에 가까우면 조화평균도 0에 가까워진다.

Dice가 겹침을 본다는 점이 클래스 불균형을 막아준다. 앞의 예시에서 모델이 모든 픽셀을 "조작 아님"으로 찍으면, 맞게 칠한 조작 픽셀이 하나도 없어 GT mask와의 겹침이 0이다. Dice 계수가 0이 되고 $\ell_{dice}$는 1로 치솟는다. BCE를 속였던 회피가 Dice에는 통하지 않는다.

BCE는 픽셀 단위 정확도를, Dice는 mask 전체의 겹침을 본다. 둘을 함께 쓰면 픽셀 단위 분류와 mask 형태 일치를 동시에 잡을 수 있다.

### 5.4 학습 흐름을 한 번 묶어보면

지금까지 본 내용을 정리하면, FakeShield의 학습은 두 단계로 진행된다.

**1단계: DTE-FDM 학습**

- DTG는 Full parameter, 3-class CE로 학습
- Projection layer도 Full parameter로 학습
- LLM은 LoRA(rank 128)로 fine-tune, $\hat{O}_{det}$에 대한 token CE
- Image Encoder는 frozen
- Loss: $\ell_{det}$ (수식 4)

**2단계: MFLM 학습**

- DTE-FDM은 frozen으로 두고, 그 출력 $O_{det}$를 입력으로 사용
- TCM은 LoRA(rank 8)로 fine-tune, 짧은 prompt text $\hat{y}_{txt}$에 대한 token CE
- SAM Decoder는 LoRA로 fine-tune, BCE + Dice mask loss
- SAM Encoder는 frozen
- Loss: $\ell_{loc}$ (수식 5)

두 단계는 따로 진행된다. 같은 LLaVA 계열 모델이 두 모듈에서 각각 fine-tune되지만, 두 학습이 서로 간섭하지 않는다.

---

## 6. 실험

### 6.1 평가 조건

==데이터셋==

학습은 MMTD-Set, 테스트는 외부 공개 벤치마크가 기본 구도다.

|도메인|학습셋|테스트셋|
|---|---|---|
|PS|CASIAv2, Fantastic Reality|CASIA1+, Columbia, IMD2020, Coverage, DSO, Korus|
|DeepFake|FFHQ + FaceApp|FFHQ + FaceApp, Seq-DeepFake|
|AIGC editing|COCO + SD-inpainting (자체 생성)|자체 생성 test set|

| 벤치마크     | 특성                                  |
| -------- | ----------------------------------- |
| CASIA1+  | copy-move + splicing 혼합, 표준 PS 벤치마크 |
| Columbia | 고화질 무압축 splicing                    |
| IMD2020  | 소셜미디어 수집, 압축/화질 열화 포함               |
| Coverage | copy-move 전용                        |
| DSO      | 실제 인터넷 수집 조작 이미지                    |
| Korus    | 다양한 PS 조작 혼합, 고해상도                  |

==비교군==

비교군은 세 그룹으로 나뉘는데, 각 그룹마다 학습 조건이 다르다는 게 중요하다.

| 비교군         | 대상 모델                                                       | MMTD-Set 재학습 |
| ----------- | ----------------------------------------------------------- | ------------ |
| 일반 IFDL     | SPAN, ManTraNet, OSN, HiFi-Net, PSCC-Net, CAT-Net, MVSS-Net | O            |
| DeepFake 전용 | CADDM, HiFi-DeepFake, RECCE, Exposing                       | O            |
| 범용 M-LLM    | GPT-4o, LLaVA-v1.6-34B, InternVL2-26B, Qwen2-VL-7B          | X            |

IFDL 모델과 DeepFake 전용 모델은 모두 MMTD-Set으로 재학습 후 비교한다. 같은 데이터로 학습된 상태에서의 아키텍처 비교라 일단 공정하다.

문제는 **범용 M-LLM 비교군**이다. 이 모델들은 사전학습 가중치 그대로 비교에 들어간다. 재학습하지 않은 이유는 짐작할 수 있는데, M-LLM을 MMTD-Set으로 fine-tuning하면 사실상 FakeShield와 같은 모델이 되어 비교 의미가 없어지기 때문이다. 일리는 있지만, 결과적으로 fine-tuning된 FakeShield와 fine-tuning 안 된 GPT-4o를 비교하는 셈이 된다.

==평가 지표==

| Task         | 지표      | 의미                     |
| ------------ | ------- | ---------------------- |
| Detection    | ACC, F1 | 이미지 단위 real/fake 판단    |
| Localization | IoU, F1 | 예측 mask와 GT mask의 겹침   |
| Explanation  | CSS     | 예측 텍스트와 GT 텍스트의 의미 유사도 |

**CSS**(Cosine Semantic Similarity)는 예측 설명과 GT 설명을 고차원 임베딩 공간에서 비교해 코사인 유사도를 계산한다. 단어가 정확히 일치하지 않아도 의미가 비슷하면 높게 나오는 지표다. "edge artifact"와 "unnatural boundary"가 다른 표현이지만 의미가 가까우면 CSS가 높게 나오는 식이다.

이 비교의 GT는 GPT-4o가 mask와 도메인별 prompt를 받아 생성한 텍스트다. 사람이 작성한 forensic 정답이 아니다. CSS가 높다는 건 "GPT-4o가 만든 설명 스타일과 의미적으로 가깝다"는 뜻이지, 실제 forensic 판단이 정확한지를 보장하진 않는다.

---

### 6.2 Detection

논문은 detection 결과를 두 표로 나눠서 보여준다. 일반 IFDL 모델과의 비교(Table 1), DeepFake 전용 모델과의 비교(Table 2).

==Table 1: 일반 IFDL 비교==

![[image-7-x100-y550.png]]
> _Table 1. 일반 IFDL 모델과 FakeShield의 detection 비교. PS 5개 벤치마크, DeepFake, AIGC editing에 대한 ACC와 F1._

FakeShield는 일곱 개 컬럼 전부에서 가장 높은 ACC를 기록한다. CASIA1+ 0.95, AIGC editing 0.98처럼 도메인을 가리지 않고 안정적이다.

baseline IFDL 모델들은 모두 MMTD-Set으로 재학습된 상태다. 그런데도 결과가 고르지 않다. ManTraNet·PSCC-Net·HiFi-Net은 DeepFake와 AIGC에서 ACC가 0.5 안팎으로 주저앉는다. 반면 CAT-Net은 세 도메인 모두에서 비교적 잘 버틴다(DeepFake 0.85, AIGC 0.82). 같은 PS 계열이라도 multi-domain 적응력이 아키텍처마다 갈리는 셈이라, "PS 전문 모델은 PS만 잘한다"는 식의 깔끔한 구도로 읽히지는 않는다.

분명한 건 어느 baseline도 세 도메인을 FakeShield만큼 고르게 잡지 못한다는 점이다. 논문은 이 안정성을 DTG의 효과로 본다. 도메인을 먼저 분류해 LLM에 힌트를 주면, 한 모델이 여러 도메인을 뭉뚱그릴 때 생기는 data domain conflict가 줄어든다는 설명이다.

==Table 2: DeepFake 전용 모델 비교==

DeepFake 전용 모델과의 비교는 다른 의미가 있다. FakeShield는 DeepFake에 특화된 모델이 아닌데, 특화 모델들과 비교해서 어떻게 나오는지 보려는 것이다.

![[image-8-x331-y403.png]]
> _Table 2. DeepFake 전용 모델과 FakeShield의 detection 비교 (DFFD, Seq-DeepFake)._

|모델|DFFD ACC/F1|Seq-DeepFake ACC/F1|
|---|---|---|
|RECCE|0.92 / 0.92|0.75 / 0.79|
|**FakeShield**|**0.98 / 0.99**|**0.84 / 0.91**|

DeepFake 전용 모델들보다 오히려 FakeShield가 앞선다.

이걸 해석하는 한 가지 시각은 다음과 같다:
- DTG가 도메인 충돌을 막는 데서 나아가, 세 도메인의 학습 신호가 **서로 보완적으로 작용**할 수 있다.
- PS에서 학습한 "edge 불일치" 단서가 DeepFake 탐지에도 간접적으로 기여하고, AIGC에서 학습한 "텍스처 부자연스러움"도 비슷한 역할을 할 수 있다.

즉, "단일 도메인 전문 모델 < 균형 있게 학습한 multi-domain 모델"이라는 구도가 나오는 셈이다. DTG가 단순히 도메인을 나누는 게 아니라, 나눈 도메인들이 서로 도움을 주는 환경을 만들어준다는 해석이 가능하다.

---

### 6.3 Explanation

Explanation 결과는 설계상 가장 비판적으로 봐야 하는 부분이다.

![[image-8-x105-y109.png]]
> _Table 3. M-LLM과 FakeShield의 explanation 품질 비교 (CSS)._

결과 자체는 명확하다. FakeShield가 모든 벤치마크에서 가장 높은 CSS를 기록한다. DSO에서 0.8873으로 두 번째로 높은 InternVL2-26B를 큰 폭으로 앞선다.

다만 이 결과를 그대로 "FakeShield가 GPT-4o보다 똑똑하다"로 읽으면 안 된다. 평가 조건 자체에 두 가지 기울기가 있다.

==GPT-4o가 낮게 나오는 이유==

GT 생성 시점과 평가 시점에서 GPT-4o가 받는 입력이 다르다.

```
GT 생성 시: 이미지 + mask + 도메인별 전용 prompt
평가 시   : 이미지만 (mask, 전용 prompt 없음)
```

GT를 만든 GPT-4o는 mask를 보고 조작 위치를 정확히 알면서 분석을 했다. 평가 받는 GPT-4o는 mask 없이 이미지만 보고 조작 위치부터 추정해야 한다. 같은 모델이지만 다른 조건이다. 그래서 GPT-4o의 CSS가 다른 모델들보다도 낮게 나오는 게 이상한 결과는 아니다.

==비교 자체의 비대칭성==

더 근본적인 문제가 있다. FakeShield만 MMTD-Set으로 fine-tuning됐고, 나머지 M-LLM들은 사전학습 가중치 그대로다.

당연히 도메인 특화 학습을 거친 모델이 범용 모델보다 도메인 특화 task에서 잘 나온다. 이건 비교라기보다 fine-tuning의 효과를 보여주는 실험에 가깝다.

진짜 공정한 비교라면 LLaVA-34B, InternVL2-26B 같은 더 큰 M-LLM들도 MMTD-Set으로 fine-tuning한 뒤 비교해야 한다. 논문이 그렇게 하지 않은 이유는 추측해볼 수 있다.

- GPU 비용 (34B, 26B 모델 fine-tuning은 자원 부담이 크다)
- 그렇게 비교했을 때 13B 베이스의 FakeShield가 이긴다는 보장이 없다

그래서 이 결과의 메시지는 "FakeShield가 다른 모든 M-LLM보다 똑똑하다"가 아니라, "범용 M-LLM을 IFDL에 그냥 던져 넣으면 안 된다, 도메인 특화 fine-tuning이 필요하다" 정도로 읽는 게 정확하다.

==그럼에도 의미 있는 부분==

비교의 비대칭성을 인정하더라도, 범용 M-LLM이 잘 못하는 게 무엇인지는 이 표에서 드러난다.

```
가능 (상식 수준 판단):
  "펭귄이 실내에 있으면 어색하다"
  "물리 법칙 위반"

불가 (forensic cue 분석):
  "조명 방향 미세 불일치"
  "경계 해상도 차이"
  "텍스처 부자연스러움"
```

범용 M-LLM은 사전학습 데이터에서 본 적 있는 상식 수준의 판단은 한다. 하지만 픽셀 단위로 단서를 분석하는 건 못한다. 이 능력은 IFDL 데이터로 추가 학습을 거쳐야 생긴다는 게 이 표가 보여주는 사실이다.

---

### 6.4 Localization

![[image-9-x105-y572.png]]
> _Table 4. 각 IFDL 모델과 FakeShield의 localization 비교 (IoU, F1)._

Localization도 거의 모든 벤치마크에서 FakeShield가 우위다. IMD2020에서는 두 번째인 OSN을 IoU 0.12, F1 0.10 차이로 앞서고, CASIA1+에서도 OSN보다 IoU 0.07, F1 0.09 위에 있다.


![[image-9-x106-y279.png]]
> _Figure 5. 각 모델의 localization 결과 시각 비교. PSCC-Net은 attention이 분산되어 mask가 흐릿하고, FakeShield는 객체 경계를 따라 깔끔한 mask를 만든다._

Figure 5를 보면 결과의 질적 차이가 더 잘 드러난다. PSCC-Net 같은 기존 모델들은 attention이 이미지 전체로 퍼지면서 mask가 흐릿하고 조작 영역을 넓게 잡는 경향이 있다. FakeShield는 비교적 객체 경계를 따라 깔끔한 mask를 만든다. 이건 SAM이 가진 segmentation 능력 덕분으로 보인다. 의미적으로 명확한 영역(특정 객체)을 잘라내는 데 SAM이 강하다.

다만 절대 IoU 수치까지 보면 조심스럽다. CASIA1+ 0.54, IMD2020 0.50, Columbia 0.67 정도는 괜찮은 편이지만, Korus 0.17, DeepFake 0.14, AIGC 0.18은 낮다. "기존 방법보다는 낫지만, 실용적인 픽셀 단위 mask까지는 아직 거리가 있다"는 정도로 읽는 게 맞을 것 같다.

특히 DeepFake와 AIGC에서 IoU가 낮은 게 눈에 띈다. PS는 객체 단위 조작(객체를 오려 붙이거나 지우는)이라 SAM의 객체 segmentation 능력이 잘 맞는데, DeepFake와 AIGC는 영역 경계가 모호하거나 조작이 미세해서 SAM 기반 접근의 한계가 드러난다.

---

### 6.5 Robustness

소셜미디어에서 이미지는 업로드 과정에서 화질 열화를 겪는다. 탐지 모델이 이런 열화를 조작으로 오해하거나, 반대로 진짜 조작 단서를 놓칠 수 있다. Robustness study는 이 조건에서 FakeShield가 어떻게 반응하는지 본다.

논문은 두 가지 열화를 본다.

- **JPEG 압축**: quality 70, 80
- **Gaussian noise**: 분산 5, 10

![[image-10-x117-y530.png]]
> _Table 5. 화질 열화 조건에서 FakeShield의 explanation/localization 성능._

|열화|CSS|IoU|F1|
|---|---|---|---|
|Original|0.8758|0.5432|0.6032|
|JPEG 70|0.8355|0.5022|0.5645|
|JPEG 80|0.8511|0.5026|0.5647|
|Gaussian 5|0.8283|0.4861|0.5494|
|Gaussian 10|0.8293|0.4693|0.5297|

성능이 소폭 하락하긴 하지만 급격히 무너지지는 않는다. 학습 시 열화 데이터를 넣지 않았는데도 이 정도다.

논문은 이 안정성을 M-LLM 기반 구조의 특성으로 해석한다. 두 접근의 차이를 직관적으로 정리하면 이렇다.

```
기존 IFDL (픽셀 단위 아티팩트 의존):
  edge artifact, 압축 흔적, noise 패턴 → 저수준 신호
  → 화질 열화 시 그 신호가 직접 오염/손실
  → 성능 급락

M-LLM 기반 (의미 정보 의존):
  "조명 방향이 다르다", "그림자가 없다" → 고수준 의미 신호
  → 저수준 노이즈에 덜 민감
  → 열화 데이터 없이도 안정
```

다만 robustness가 완벽하다는 뜻은 아니다. CSS와 IoU 모두 떨어진다. Gaussian 10에서 IoU가 0.5432에서 0.4693까지 내려가는데, 픽셀 단위 localization은 여전히 화질 열화의 영향을 받는다는 뜻이다. Detection 텍스트(CSS)는 의미 단위라 더 강건하지만, mask는 픽셀 단위 출력이니까 화질 자체에 더 민감하다.

---

## 7. Ablation Study

지금까지 결과 표를 봤다. FakeShield가 잘 한다는 건 알겠는데, 그게 어느 컴포넌트 덕분인지가 ablation의 질문이다. 논문은 본문에서 두 ablation, 부록에서 두 ablation을 더해 총 네 가지를 다룬다. 각 실험이 무엇을 검증하려는 것인지 짚으면서 따라가자.

검증 대상을 미리 정리하면 다음과 같다.

|실험|검증 대상|위치|
|---|---|---|
|1. DTG 제거|DTG가 정말 도메인 충돌을 막는가|Table 6|
|2. LLM in DTE-FDM 제거|DTE-FDM과 MFLM의 디커플링이 의미 있는가|Figure 6|
|3. MFLM Error Correction 추가|TCM이 $O_{det}$ 오류를 명시적으로 교정하면 좋은가|Appendix Table 8|
|4. TCM 입력 조합 변경|$O_{det}$가 정말 localization에 기여하는가|Appendix Table 9|

### 7.1 DTG가 정말 필요한가 (Table 6)

> DTG를 제거하고 LLM에 도메인 힌트 없이 이미지와 instruction만 주면 어떻게 될까.

```
원본:    T_tag(DTG 힌트) + T_img + T_ins → LLM → O_det
w/o DTG:                 T_img + T_ins → LLM → O_det
```

![[image-10-x303-y317.png]]
> _Table 6. DTG 유무에 따른 detection 성능 비교._

| 도메인      | ACC 낙폭 | F1 낙폭 | 해석                               |
| -------- | ------ | ----- | -------------------------------- |
| CASIA1+  | -0.03  | -0.03 | PS 아티팩트가 명확해서 힌트 없어도 어느 정도 탐지 가능 |
| IMD2020  | -0.12  | -0.11 | 다양한 압축/화질 → 힌트 의존도 중간            |
| DeepFake | -0.09  | -0.09 | 얼굴 특화 아티팩트 → 어느 정도 인식 가능         |
| AIGC     | -0.21  | -0.15 | 새로운 아티팩트 패턴 → DTG 의존도 가장 큼       |

도메인 아티팩트가 불명확할수록 DTG의 효과가 크다.
- PS는 edge artifact가 비교적 명확해서 DTG 없어도 어느 정도 잡히지만,
- AIGC는 모델이 익숙하지 않은 패턴이라 도메인 힌트 없이는 길을 잃는다.

DTG가 단순 보조 텍스트가 아니라 LLM이 어떤 forensic cue를 우선적으로 봐야 하는지 방향을 잡아주는 역할을 한다는 게 수치로 드러난다.

### 7.2 LLM in DTE-FDM은 정말 필요한가 (Figure 6)

> DTE-FDM의 LLM을 통째로 빼면 어떻게 되는가.

LLM을 빼면 누군가 그 자리를 메워야 하는데, 논문은 TCM이 그 일까지 수행하도록 만들어서 실험한다.

```
원본:
  T_tag + T_img + T_ins → LLM → O_det
                                  ↓
              O_det + T_img → TCM → h<SEG> → SAM → M_loc

w/o LLM:
  T_tag + T_img + T_ins → TCM → h<SEG> → SAM → M_loc
                          ↑
                  TCM이 O_det 생성과 h<SEG> 추출을 동시에 수행
```

이렇게 하면 사실상 디커플링이 사라진다. 분리됐던 두 task(text 생성과 mask 생성)가 다시 한 모듈에서 처리되는 셈이다.

![[image-10-x311-y525.png|600]]
> _Figure 6. DTE-FDM LLM 제거 시 localization IoU 변화 (25 epochs)._

결과는 명확하다. w/o LLM은 전체 학습 과정 내내 IoU가 원본보다 낮고, 더 일찍 수렴한다.
모델 용량이 줄어 학습이 일찍 한계에 도달한 것으로 볼 수 있다.

이 결과를 두 가지 손실로 나눠서 해석할 수 있다.

손실 1. $O_{det}$의 의미적 정보가 사라진다

원본 구조에서 TCM은 "어디가 어떻게 조작됐는지" 분석된 자연어 설명을 받아서 그 의미를 활용했다.
LLM을 빼면 TCM이 받는 입력은 도메인 태그와 이미지 토큰뿐이다.
"조명 방향이 안 맞는다", "경계 해상도가 다르다" 같은 **forensic cue**가 텍스트로 정리되지 않은 상태에서, TCM이 image token만 보고 mask를 그려내야 한다. 그 의미 정보의 빈자리가 그대로 성능 차이로 나타난다.

손실 2. 디커플링이 깨진다

TCM 하나가 텍스트 생성과 mask 생성을 동시에 떠안게 된다. 성격이 다른 두 task를 한 모델에 묶으면 학습 신호가 서로 간섭한다는 것, 그게 두 모듈을 나눈 이유였다. 이 ablation은 정확히 그 상황을 만들어 보인다. 디커플링 설계의 정당성이 실험으로 직접 확인되는 결과다.

### 7.3 부록의 두 실험

본문 두 ablation으로 DTG와 디커플링의 정당성은 확인됐다.
부록의 두 실험은 더 미세한 질문을 다룬다. MFLM이 $O_{det}$를 어떻게 활용해야 하는가에 대한 질문이다.

==Error Correction을 추가하면? (Table 8)==

> DTE-FDM의 LLM이 만든 $O_{det}$는 틀릴 수 있다. 그렇다면 TCM에서 이 오류를 명시적으로 교정하게 만들면 더 좋아지지 않을까?


```
원본:
  부정확할 수 있는 O_det → TCM → h<SEG> → M_loc
  Loss: mask loss (BCE + Dice)만

Error Correction 추가:
  부정확할 수 있는 O_det → TCM → h<SEG> → M_loc
  Loss: mask loss + 텍스트 교정 loss (TCM 출력을 GT O_det에 맞추기)
```

직관적으로는 GT를 향해 끌어주니까 더 좋아질 것 같지만, 결과는 그렇지 않다.

![[image-17-x116-y496.png]]
> *Table 8. MFLM에 error correction을 추가*

| Method                          | CASIA1+ IoU/F1  |
| ------------------------------- | --------------- |
| Using correct $O_{det}$ (교정 추가) | 0.51 / 0.56     |
| FakeShield (원본)                 | **0.54 / 0.60** |


논문의 해석은 두 최적화 목표가 서로 간섭한다는 것이다.
mask 최적화(BCE + Dice)와 텍스트 교정 최적화(CE)가 같은 모델에 동시에 걸리면, 한쪽을 잘하려고 하면 다른 쪽이 흔들리는 trade-off가 생긴다.

여기서 더 나아가서 해석해보면, MFLM은 이미 자체적인 error correction 능력을 가지고 있다고 볼 수 있다.
학습 과정을 다시 보면, TCM은 부정확할 수 있는 $O_{det}$를 입력으로 받는데 정답은 GT mask다. 즉, $O_{det}$가 약간 틀려도 GT mask를 맞히도록 학습되니까, 자연스럽게 $O_{det}$의 사소한 오류를 무시하고 mask 생성에 필요한 부분만 골라 쓰는 능력이 생긴다.

명시적 교정 메커니즘을 추가하면 이 자연스러운 능력을 오히려 방해한다는 게 이 ablation이 보여주는 것이다. "더 정교하게 만들어주면 더 좋아질 거야"라는 직관이 항상 맞는 건 아닌 셈이다.

==TCM에 무엇을 넣어야 하는가 (Table 9)==

마지막 ablation은 TCM의 입력 조합을 바꾼다. $O_{det}$가 정말 localization에 핵심적인 입력인지를 직접 검증한다.

![[image-17-x106-y290.png]]
> *Table 9. TCM 입력 조합에 따른 localization 성능.*

| TCM 입력                            | CASIA1+ IoU/F1  | IMD2020 IoU/F1  | AIGC IoU/F1     |
| --------------------------------- | --------------- | --------------- | --------------- |
| $T_{ins}$ + $T_{img}$             | 0.50 / 0.55     | 0.48 / 0.53     | 0.12 / 0.15     |
| $T_{ins}$ + $T_{tag}$             | 0.49 / 0.54     | 0.47 / 0.52     | 0.12 / 0.14     |
| $T_{ins}$ + $T_{tag}$ + $T_{img}$ | 0.51 / 0.55     | 0.48 / 0.54     | 0.11 / 0.14     |
| **$O_{det}$ + $T_{img}$** (원본)    | **0.54 / 0.60** | **0.50 / 0.57** | **0.18 / 0.24** |

세 가지 시각이 보인다.

$O_{det}$는 다른 입력으로 대체되지 않는다.
- 조합 1~3은 모두 $O_{det}$ 없이 원래 입력 요소만 다른 조합으로 넣은 것이다. 도메인 태그도 있고, 이미지 토큰도 있고, instruction도 있다. 그런데 전부 원본보다 낮다.
- DTE-FDM의 LLM이 만든 $O_{det}$가 단순 이미지+태그 조합으로는 대체되지 않는다는 직접 증거다.

**$T_{tag}$ 단독은 오히려 약간 해롭다**.
- 조합 2($T_{ins}$ + $T_{tag}$, 0.49)가 조합 1($T_{ins}$ + $T_{img}$, 0.50)보다 낮다.
- 도메인 태그 텍스트만 있고 이미지 토큰이 없으면 TCM이 mask 그릴 시각 정보가 부족해서 더 어려워진다.
- DTG가 효과를 발휘하려면 LLM이 그 태그를 가지고 이미지를 함께 보고 분석을 풀어내는 과정이 필요하다.

AIGC에서 차이가 가장 크다.
- 조합 1~3에서 AIGC IoU는 0.11~0.12인데 원본은 0.18이다. 0.06~0.07의 격차로 다른 도메인보다 차이가 크다.
- 아티팩트 패턴이 불명확한 도메인일수록 LLM이 정리한 의미적 설명에 더 많이 의존한다고 읽을 수 있다.

### 7.4 네 ablation을 묶어보면

지금까지 본 네 ablation의 결론을 모아보면 일관된 메시지가 나온다.

메시지 1. 디커플링 설계가 일관되게 정당화된다

- 7.2 (LLM 제거): 한 모델이 텍스트와 mask를 동시에 처리하면 학습 신호가 서로 간섭한다
- 7.3.1 (Error Correction): 한 모듈에 두 최적화 목표를 걸면 trade-off가 생긴다

두 실험 모두 "task를 분리해서 각자 최적화하는 게 낫다"는 결론으로 모인다.

메시지 2. $O_{det}$가 localization 성능을 좌우한다

- 7.2 (LLM 제거): LLM 없이 만든 mask는 전 학습 과정에서 낮은 IoU
- 7.3.2 (TCM 입력 조합): $O_{det}$를 다른 입력 조합으로 대체할 수 없다

DTE-FDM이 만든 텍스트는 사용자에게 보여주는 부가 출력에 그치지 않는다. MFLM이 mask를 그리려면 반드시 받아야 하는 입력이고, 이 점이 두 실험에서 직접 확인된다.

메시지 3. AIGC가 DTG와 $O_{det}$의 의존도를 가장 명확히 드러낸다

- DTG ablation: AIGC 낙폭 가장 큼
- TCM 입력 조합: AIGC에서 $O_{det}$ 유무 차이 가장 큼

도메인 아티팩트가 모델에게 익숙하지 않을수록 텍스트로 정리된 도메인 힌트와 forensic 분석이 더 중요해진다. 거꾸로 말하면, FakeShield의 LLM 활용 전략이 가장 빛을 발하는 영역이 AIGC라는 뜻이다. PS처럼 edge artifact가 명확한 도메인은 기존 IFDL도 어느 정도 잡지만, AIGC처럼 새롭고 미묘한 도메인에서 LLM의 의미적 분석이 결정적인 차이를 만든다.

메시지 4. 더 정교한 메커니즘이 항상 답은 아니다

"$O_{det}$가 틀릴 수 있으니 명시적으로 교정하자"는 합리적인 직관이지만, 결과는 반대로 나왔다. 모델이 학습 과정에서 자연스럽게 형성한 능력(불완전한 입력을 무시하고 정답을 맞히는 능력)을, 명시적 메커니즘이 오히려 방해할 수 있다.

---

## 8. Conclusion

이 논문이 한 일을 핵심만 묶어보면 두 가지다.

**MMTD-Set**. 기존 IFDL 데이터셋이 image와 mask까지만 가지고 있던 것을, GPT-4o를 annotator로 활용해 image-mask-description 삼중항으로 확장했다. 도메인별 prompt 설계로 PS / DeepFake / AIGC 각각의 forensic cue에 맞춘 텍스트 GT를 자동 생성하는 방식이다.

**FakeShield**. M-LLM 기반 explainable IFDL 프레임워크를 제안했다. 두 모듈로 task를 분리하고, 모듈 사이를 텍스트($O_{det}$)와 prompt embedding($h_{<\text{SEG}>}$)으로 연결하는 구조다. DTE-FDM이 LLM의 자연어 생성 능력으로 detection과 explanation을 처리하고, MFLM이 그 텍스트를 다시 LLM(TCM)으로 인코딩해 SAM의 segmentation 능력에 연결한다.

논문이 강조하는 활용 가능성은 디지털 콘텐츠 조작 관련 법규 마련, 생성 AI 가이드라인 개발, 법정 증거 수집, 잘못된 정보 정정 같은 실용적 응용이다. 단순 detection을 넘어 '왜 가짜인지'까지 함께 설명하는 능력이 이런 응용에서 의미를 가진다는 것이 논문의 맺음말이다.

---

## 9. Limitation

논문이 직접 짚는 한계는 복잡한 DeepFake 조작에서의 성능 부족이다.

구체적으로:

- Identity switching (한 사람의 얼굴을 다른 사람으로 바꾸는 조작)
- Full-face generation (얼굴 전체를 새로 생성하는 조작)

이런 조작들은 부분적인 속성 변경(FaceApp 같은)과 달리 얼굴 전체나 큰 영역이 바뀌어서, FakeShield가 사용한 부분적 단서(입·눈 주변의 국소 blur 같은)로는 잡기 어렵다. 학습 데이터 자체도 FaceApp 기반 부분 조작 위주로 구성되어 있어서, 더 복잡한 DeepFake 조작에 대한 일반화에 한계가 있다.

논문이 제시하는 향후 개선 방향은 세 가지다.

Chain-of-Thought 메커니즘 도입. 현재 FakeShield는 이미지를 받아 한 번에 분석 결과를 출력하는 구조다. CoT를 도입하면 단계별 추론이 가능해서 미묘한 조작도 잡아낼 수 있다는 게 논문의 기대다.

> [!info] Chain-of-Thought (CoT)
> 일반적인 LLM 추론은 질문을 받으면 바로 답을 낸다.
> 
> ```
> 일반: "이 이미지 조작됐나?" → "Yes"
> ```
> 
> CoT는 중간 추론 단계를 명시적으로 거치게 한다.
> 
> ```
> CoT: "이 이미지 조작됐나?"
>   → "1. 조명 방향 확인 → 불일치 있음"
>   → "2. 경계 픽셀 확인 → 아티팩트 있음"
>   → "3. 그림자 방향 확인 → 불일치 있음"
>   → "따라서 조작됐음"
> ```
> 
> 복잡한 추론 task에서 LLM이 한 번에 답을 내는 것보다 단계를 밟는 게 정확도가 높다는 게 알려져 있다. IFDL에서도 미세한 조작은 한 번에 보기보다 여러 forensic cue를 순차적으로 확인하는 게 더 효과적일 수 있다.

**학습 데이터 확장**. DeepFake 샘플의 다양성을 늘려서 더 넓은 조작 기법을 커버하겠다는 방향이다.

**모듈 최적화**. 복잡한 조작을 잘 다룰 수 있도록 프레임워크 내 특정 모듈들을 개선한다는 일반론적 방향.

---

## SIDA와의 비교

> [!note] SIDA
> 1차 발표에서 리뷰한 논문(Huang et al., 2025). FakeShield와 같은 explainable IFDL 문제를 다룬다. 두 논문은 비슷한 시기에 나온 concurrent work이고, SIDA의 related work는 FakeShield를 직접 언급하기도 한다.

SIDA와 FakeShield는 닮은 출발선에 서 있다. 둘 다 "새 데이터셋 + 새 모델"을 한 쌍으로 내놓았고(SIDA는 SID-Set과 SIDA, FakeShield는 MMTD-Set과 FakeShield), 둘 다 LLaVA·LISA 계보 위에서 M-LLM으로 detection·localization·explanation을 함께 풀려 한다. 본문은 FakeShield에 집중하느라 SIDA 언급을 덜어냈는데, 비교가 의미 있는 지점을 여기 모은다.

| 항목 | SIDA | FakeShield | 본문 |
| --- | --- | --- | --- |
| 핵심 설계 | 한 VLM에 `<DET>`·`<SEG>` 토큰을 통합 | 두 모듈(DTE-FDM·MFLM)로 디커플링 | [[02_FakeShield#3.3 정리하면 이렇게 된다\|3.3절]] |
| detection 출력 | `<DET>` 토큰 → FC head, 전용 3-class 분류기 | 별도 head 없이 LLM 자연어 출력에 포함 | [[02_FakeShield#3.1 어떻게 풀 것인가\|3.1절]] |
| fake의 범위 | real / 완전 합성 / 부분 조작 | 부분 조작만 (완전 합성 이미지는 제외) | [[02_FakeShield#2.1 도메인별 데이터 수집\|2.1절]] |
| explanation 데이터 | 30만 장 중 3천 장에만 텍스트 라벨 | 전 샘플이 image-mask-description 삼중항 | [[02_FakeShield#2.2 GPT-4o로 텍스트 GT 만들기\|2.2절]] |
| 이미지 토큰 경로 | ViT + projection layer (LLaVA 계열) | 동일 | [[02_FakeShield#4.1.2 수식 (1): LLM에 들어가는 두 가지 정보\|4.1.2절]] |
| mask loss | BCE + Dice | 동일 | [[02_FakeShield#5.3.2 BCE와 Dice를 함께 쓰는 이유\|5.3.2절]] |
| 화질 열화 robustness | SIDA-7B가 6개 열화 조건에 안정적 | 4개 조건, 동일 경향 | [[02_FakeShield#6.5 Robustness\|6.5절]] |

통합 대 분리, 그러나 의도는 같다. 가장 큰 대비는 핵심 설계다. SIDA는 detection과 segmentation을 한 VLM 안에서 `<DET>`·`<SEG>` 토큰으로 함께 처리하고, FakeShield는 두 task를 별도 모듈로 떼어놓는다. 다만 두 논문 모두 "detection 정보가 localization을 가이드해야 한다"는 생각은 공유한다. SIDA는 그것을 Attention Module로 푼다. detection 토큰의 hidden state를 Query로 삼아 segmentation 토큰에서 필요한 정보를 끌어오는 구조다. FakeShield는 같은 일을 모듈 사이로 텍스트 $O_{det}$를 넘기는 방식으로 한다. 의도는 같고 메커니즘이 정반대인 셈이다.

문제를 자르는 축이 다르다. SIDA는 fake를 real·완전 합성·부분 조작으로 나누고(조작의 정도), FakeShield는 PS·DeepFake·AIGC로 나눈다(조작의 도구). SIDA가 완전 합성 이미지까지 품을 수 있는 건 detection을 중심에 두기 때문이고, FakeShield가 부분 조작만 다루는 건 localization을 핵심에 두기 때문이다. 완전히 생성된 이미지에는 조작 경계가 없어 mask 자체를 정의할 수 없다. 데이터셋의 범위 차이가 곧 두 모델이 무엇을 1순위 task로 보는지를 드러낸다.

explanation을 데이터에 얼마나 무겁게 싣나. SIDA의 텍스트 설명 라벨은 30만 장 중 3천 장뿐이고, 학습도 detection·segmentation을 먼저 끝낸 뒤 explanation을 나중에 fine-tuning으로 얹는다. FakeShield는 MMTD-Set의 모든 샘플이 description을 갖는 삼중항이다. e-IFDL의 'explainable'을 데이터 차원에서 얼마나 핵심으로 가져가느냐가 갈린다.

두 설계 모두 자기 방식의 ablation으로 정당화되어 있어, 어느 쪽이 정답이라기보다 e-IFDL이 가진 설계 자유도를 보여주는 두 사례로 읽힌다. 한편 두 논문 모두 explanation GT를 GPT-4o로 만든다는 점은 같다. GPT-4o GT가 안고 있는 한계는 FakeShield만의 문제가 아니라 이 접근 계열이 공통으로 안고 가는 과제인 셈이다.

---

## My Thoughts

### Pros

읽는 내내 든 생각은, 이 논문이 LLM의 의미 해석 능력을 어떻게든 끝까지 활용하고 싶어 한다는 것이었다.

기존 IFDL은 픽셀 단위 아티팩트를 신호로 삼는다. 반면 이 논문은 "조명 방향이 안 맞는다", "경계 해상도가 다르다" 같은 단서를 자연어로 이해하고 풀어내는 LLM의 강점을, e-IFDL의 거의 모든 자리에 끌어다 쓴다. detection과 explanation은 LLM이 자연어로 처리하고, localization도 SAM에 곧장 가지 않고 TCM이라는 LLM을 한 번 더 거쳐 $O_{det}$의 의미를 옮겨준다. 도메인 힌트(DTG)마저 결국 LLM에게 줄 텍스트다.

픽셀이 아니라 의미를 신호로 삼겠다는 이 일관된 태도는 robustness 결과와도 맞물린다. 의미 수준의 판단은 저수준 노이즈에 덜 흔들리기 때문이다. 같은 e-IFDL 문제라도 "LLM의 의미 해석을 최대한 활용한다"는 하나의 관점으로 전체 설계를 꿸 수 있다는 점이, 이 논문에서 가장 인상적이었다.

---

### Cons
==GPT-4o 기반 GT(Ground Truth)의 본질적 한계==

MMTD-Set의 텍스트 GT는 사람이 작성한 forensic 정답이 아니라 GPT-4o가 mask와 도메인별 prompt를 받아 만든 설명이다. 그래서 이 데이터셋으로 학습한 모델의 explanation 능력은 "사람의 forensic 판단과 얼마나 맞는가"가 아니라 "GPT-4o의 설명 스타일과 의미적으로 얼마나 가까운가"를 학습한 결과에 가깝다.
평가 지표인 CSS도 GPT-4o GT와의 의미 유사도를 보는 거라, 이 한계가 그대로 평가에도 들어간다. FakeShield가 진짜 forensic cue를 잘 분석하는지, 아니면 GPT-4o의 분석 스타일을 잘 모사하는지를 구분하기 어렵다.

_관련 본문: [[02_FakeShield#2.2 GPT-4o로 텍스트 GT 만들기|2.2절]]_

==M-LLM 비교의 비대칭성==

Explanation 비교(Table 3)에서 FakeShield만 MMTD-Set으로 fine-tuning된 상태고, 비교군 M-LLM들(GPT-4o, LLaVA-34B, InternVL2-26B 등)은 사전학습 가중치 그대로다. 결과 자체는 명확한 우위지만, 이건 "FakeShield가 다른 M-LLM보다 똑똑하다"기보다 "도메인 특화 fine-tuning의 효과"를 보여주는 비교에 가깝다. 진짜 공정한 비교는 더 큰 M-LLM들도 MMTD-Set으로 fine-tuning한 후 비교하는 것일 텐데, GPU 비용 부담과 결과 불확실성 때문에 시도되지 않은 것으로 보인다.

_관련 본문: [[02_FakeShield#6.3.2 비교 자체의 비대칭성|6.3.2절]]_

==DTG에 대한 추가 분석 부재==

Ablation에서 DTG 제거 시 detection 성능이 떨어진다는 건 보였지만, 두 가지가 빠져 있다고 생각했다.

1) DTG 제거 시 localization 성능 변화가 보고되지 않아서 파이프라인 전체에서의 DTG 영향을 완결성 있게 보기 어렵고,
2) **DTG 자체의 분류 정확도**도 보고되지 않아서 DTG 오분류 시 downstream에 미치는 영향을 따져볼 수 없다.

DTG는 파이프라인 앞단에 있어서 오분류가 $O_{det}$ 품질과 mask까지 전파될 가능성이 있는데, 이 민감도 분석이 없는 게 아쉽다. 특히 DeepFake 훈련 데이터가 7,300장 정도로 다른 도메인보다 적어서, DTG가 DeepFake를 다른 도메인으로 오분류할 가능성도 따져봐야 한다.

_관련 본문: [[02_FakeShield#7.1 DTG가 정말 필요한가 (Table 6)|7.1절]]_

==Localization 절대 성능의 한계==

Localization에서 FakeShield가 기존 모델 대비 우위를 보이긴 하지만, 절대 IoU 수치로 보면 여전히 낮은 영역들이 있다. CASIA1+ 0.54, IMD2020 0.50 정도는 괜찮은 편이지만, Korus 0.17, DeepFake 0.14, AIGC 0.18은 픽셀 단위 정확도로 봤을 때 실용적 수준에 못 미친다.

특히 DeepFake와 AIGC가 낮은데, SAM이 객체 단위 segmentation에 강한데 반해 이 두 도메인은 영역 경계가 모호하거나 조작이 미세해서 SAM 기반 접근의 한계가 그대로 드러난다.

_관련 본문: [[02_FakeShield#6.4 Localization|6.4절]]_

==도메인 정의==

MMTD-Set은 PS / DeepFake / AIGC 세 도메인으로 fake를 정의한다. 하지만 실제 소셜 미디어에서 마주치는 fake는 이 세 도메인의 혼합이거나 그 어느 쪽에도 정확히 들어맞지 않는 경우가 많다.

예를 들어 DeepFake로 얼굴을 바꾼 뒤 PS로 배경을 합성하는 식의 다단계 조작은 DTG가 어떤 도메인으로 분류해야 할지 모호하다. 도메인 분류 자체를 가정하는 구조가 미래의 더 복잡한 조작에 어떻게 대응할지가 불투명하다.

_관련 본문: [[02_FakeShield#4.1.1 DTG가 하는 일|4.1.1절]]_

---

### 향후 연구 도출

위의 한계들과 논문이 직접 제시한 방향을 묶어보면, 자연스럽게 몇 가지 향후 연구 방향이 보인다.

데이터 품질의 본질적 개선. GPT-4o 기반 GT의 한계가 가장 근본적인 문제다. 사람이 검증한 forensic GT를 일부라도 확보해서 평가셋으로 사용하면, 현재 CSS 기반 평가의 모호함을 줄일 수 있다. 또는 GPT-4o 외의 다른 M-LLM이 만든 설명과의 일치도까지 함께 보는 식으로 평가 지표를 다각화하는 것도 한 방향이다. 적어도 평가 단계에서만이라도 GPT-4o 의존성을 줄이는 게 신뢰성 확보에 필요해 보인다.

도메인 분류 구조의 유연화. 현재 DTG는 PS / DeepFake / AIGC 중 하나를 강제 할당하는 3-way classifier다. 실제 조작은 도메인이 혼합되거나 모호한 경우가 많은데, 단일 도메인으로 강제 분류하는 구조가 이런 케이스를 포착하기 어렵다. 다중 도메인 가중치를 출력하는 soft classification, 또는 도메인 자체를 미리 정의하지 않고 LLM이 단서 종류를 자율적으로 식별하는 구조가 대안이 될 수 있다. 후자가 더 야심찬 방향이지만, "edge artifact가 보인다"와 "facial blur가 보인다"가 한 이미지에 공존할 수 있는 환경을 다룰 수 있다.

Localization 정확도 개선. 현재 SAM 기반 접근은 객체 단위 조작에는 잘 맞지만 영역 경계가 모호한 조작(DeepFake, AIGC)에서 약하다. 픽셀 단위 정확도를 높이려면 SAM의 segmentation 능력에만 의존하지 말고, edge artifact나 noise pattern 같은 저수준 단서를 함께 활용하는 hybrid 구조가 필요할 수 있다. 다만 이렇게 하면 robustness study에서 본 M-LLM 기반의 강점(저수준 노이즈에 덜 민감)이 일부 희석될 수 있어서, trade-off를 어떻게 잡을지가 설계 포인트가 된다.

CoT 메커니즘 도입. 논문이 직접 제시한 방향인데, 도메인 유연화 방향과 묶으면 더 설득력이 생긴다. 단계별 추론은 미세한 조작을 잡는 데만 유리한 게 아니라, 추론 과정이 그대로 사용자에게 노출되므로 "왜 그렇게 판단했는가"의 검증 가능성을 높인다. e-IFDL의 explanation을 한 단계 더 신뢰할 수 있게 만드는 방향이다.

DTG 민감도 분석. 논문 자체의 분석 부재를 보완하는 후속 연구로, DTG 분류 정확도가 전체 파이프라인 성능에 미치는 영향을 정량화하는 게 의미 있다. 의도적으로 DTG에 잘못된 도메인 태그를 주입했을 때 $O_{det}$ 품질과 mask가 어떻게 망가지는지를 보면, DTG의 robustness 요구치를 명확히 할 수 있다. 이 분석은 실제 배포 환경에서 DTG가 흔들렸을 때의 실패 모드를 예측하는 데도 도움이 된다.

---

## 마치며

두 번째로 논문 리뷰 노트를 작성해봤다.
처음보다는 어느 정도 요령이 잡혀 속도가 붙을 줄 알았는데, 전혀 아니었다.

심지어 첫 번째 리뷰 논문인 SIDA와는 task도 내용도 비슷해서 읽을 때 이해가 좀 잘 되는 편이었는데, 그래서 그런지 그 이해한 내용과 직관을 전부 리뷰에 담아내려고 하다 보니 오히려 더 시간이 오래 걸렸던 것 같다.
덕분에 리뷰 노트 분량도 전에 비해 배로 늘었다.

이제 XAI 프로젝트로 논문 리뷰하는 건 이게 마지막일 것 같다.

다음 번엔 개인적으로 읽고 싶은 Paper를 선택해서 공부 · 연구 주제 탐색 등으로 논문 리뷰를 작성해보려 한다.
아마 종강하고 7월이나 되어야 다음 논문 리뷰 포스트를 업로드할 수 있지 않을까 싶다.

---

## Reference

- **FakeShield** — Xu et al., *FakeShield: Explainable Image Forgery Detection and Localization via Multi-modal Large Language Models*, ICLR 2025. [arXiv](https://arxiv.org/abs/2410.02761) · [GitHub](https://github.com/zhipeixu/FakeShield)
- **LISA** — Lai et al., *LISA: Reasoning Segmentation via Large Language Model*, CVPR 2024. [arXiv](https://arxiv.org/abs/2308.00692)
- **SAM** — Kirillov et al., *Segment Anything*, ICCV 2023. [arXiv](https://arxiv.org/abs/2304.02643)
- **LLaVA** — Liu et al., *Visual Instruction Tuning*, NeurIPS 2023. [arXiv](https://arxiv.org/abs/2304.08485)
- **SIDA** — Huang et al., *SIDA: Social Media Image Deepfake Detection, Localization and Explanation with Large Multimodal Model*, CVPR 2025. [arXiv](https://arxiv.org/abs/2412.04292) · 리뷰 노트: [[01_SIDA]]
