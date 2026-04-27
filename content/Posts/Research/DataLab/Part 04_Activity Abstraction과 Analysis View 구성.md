---
title: "Part 04. Activity Abstraction과 Analysis View 구성"
date: 2026-04-03
modified: 2026-04-28
---

## 들어가며

Baseline event log를 구성한 뒤에는 activity granularity 문제가 남았다. MIMIC-IV의 raw activity label은 source-native item ID나 medication identifier처럼 세밀한 값이 많다. 이를 그대로 process mining activity로 사용하면 model이 지나치게 복잡해질 수 있다.

반대로 activity를 너무 크게 묶으면 clinical difference가 사라진다. 따라서 이 단계에서는 raw provenance를 L0에 보존하면서, process mining에서 읽을 수 있는 L1/L2 activity view를 별도로 구성했다.

이 글에서는 L0/L1/L2 activity hierarchy, native category 기반 abstraction, EMAR medication mapping, 5-minute analysis view를 정리한다.

## 이 글에서 다루는 것

- raw EHR activity label이 process mining에 바로 쓰기 어려운 이유
- L0/L1/L2 activity hierarchy
- MIMIC-IV native category를 우선 사용한 이유
- EMAR medication mapping과 unmapped value 처리
- `76,062,216` events에서 `10,483,531` events analysis view로 줄어든 과정

---

## 1. Activity Cardinality 문제

초기 탐색에서 반복적으로 확인한 기준 중 하나는 event 수보다 activity 종류 수였다. Process mining에서 activity cardinality가 너무 크면 process model이 복잡해지고, trace 간 비교도 어려워진다.

MIMIC-IV에서는 이 문제가 source table마다 다르게 나타났다. `chartevents`와 `labevents`는 item ID가 많고, medication은 drug identifier와 mapping 문제가 있었다. Microbiology event는 specimen과 test name을 어떤 축으로 activity화할지에 따라 해석이 달라졌다.

따라서 activity abstraction은 단순히 label을 줄이는 작업이 아니라, source-specific meaning을 보존하면서 분석 가능한 granularity를 정하는 작업이었다.

## 2. L0/L1/L2 Level Design

이 프로젝트에서는 activity를 세 단계로 나누었다.

| Level | Meaning | Main use |
|---|---|---|
| L0 | source-native item or activity identifier | provenance, audit, detailed validation |
| L1 | table-specific clinical category | main process mining activity level |
| L2 | broader analysis group | high-level process view and scale control |

L0는 원본과 연결되는 가장 세부적인 activity다. 예를 들어 `itemid`, medication identifier, source-native label이 여기에 해당한다. L1은 table-specific category에 가깝고, L2는 더 큰 흐름을 보기 위한 상위 group이다.

이 hierarchy는 clinical gold-standard ontology가 아니라 process mining analysis를 위한 grouping이다. 모든 source에 동일한 수준의 임상적 mapping 근거가 있었던 것은 아니므로, analysis-oriented abstraction으로 해석했다.

## 3. Native Category 우선 사용

가능하면 MIMIC-IV가 제공하는 metadata category를 먼저 사용했다. `d_labitems`, `d_items` 같은 dictionary table에는 source-specific category가 있었고, 이는 원본 table과 자연스럽게 연결된다.

외부 ontology를 적용하는 방식도 검토할 수 있지만, coverage와 crosswalk 문제가 생길 수 있다. 이 작업에서는 먼저 dataset 내부에서 설명 가능한 category를 사용하고, 필요한 경우에만 source-specific mapping을 추가하는 방식을 택했다.

| Source family | L0 | L1 principle | L2 principle |
|---|---|---|---|
| `labevents` | `itemid` | `d_labitems` category | lab-level group |
| `chartevents` | `itemid` | `d_items` category | view-dependent |
| `inputevents` | `itemid` | `d_items` category | input/therapy group |
| `outputevents` | `itemid` | `d_items` category | output group |
| `procedureevents` | `itemid` | `d_items` category | procedure group |
| `microbiologyevents` | specimen/test fields | specimen-centered grouping | microbiology group |
| `emar` | medication administration identifier | medication mapping | route/form-oriented group |

Native category를 우선한 이유는 coverage, transparency, provenance 측면에서 안정적이었기 때문이다.

## 4. Source별 Abstraction 차이

`labevents`는 `d_labitems` category를 활용할 수 있어 비교적 명확했다. Chemistry, Hematology, Blood Gas 같은 category는 process-level view에서도 해석 가능했다.

`chartevents`는 가장 큰 source였고 abstraction도 가장 조심스러운 table이었다. Baseline event log에서 55,347,183 events, 72.77%를 차지했고, item 수가 많으며 batch timestamp가 강했다. Bedside charting, device/protocol logging, repeated monitoring이 섞여 있어 frequency를 clinical importance로 바로 해석하기 어렵다.

`microbiologyevents`는 test name과 specimen axis를 분리해서 보아야 했다. 검사 방법을 activity로 볼지, specimen type을 activity로 볼지에 따라 process interpretation이 달라진다. 이 작업에서는 specimen-centered grouping을 process-level 해석에 더 적합한 방향으로 보았다.

`admissions`, `icustays`, `transfers` 같은 movement/boundary source는 item category보다 event type과 location context를 우선해서 보았다. Admission start, discharge, death, ICU in/out은 activity abstraction보다 process boundary design에 가깝다.

## 5. EMAR Medication Mapping

Medication은 abstraction trade-off가 뚜렷한 영역이었다. `prescriptions`는 order/prescription record이고, `emar`는 actual administration record에 가깝다. Event source는 `emar`로 두고, abstraction에는 `prescriptions`와 identifier 정보를 보조적으로 사용했다.

Mapping path는 다음처럼 정리했다.

```text
emar administration event
  -> pharmacy_id
  -> prescriptions context
  -> drug identifier / NDC support
  -> medication form or route-oriented grouping
```

Historical EMAR mapping result는 다음과 같았다.

| Metric | Value |
|---|---:|
| Original EMAR L0 values | 973,997 |
| Mapped values | 878,946 |
| Unmapped / lost values | 95,051 |
| Loss rate | 9.8% |
| L1 cardinality | 31 |
| L2 cardinality | 6 |

Unmapped value는 강제로 가장 가까운 category에 넣지 않았다. 근거가 약한 mapping을 만들기보다, mapping loss를 명시하고 baseline/provenance layer에서 확인 가능하도록 두는 방식이 더 적절하다고 보았다.

## 6. 5-Minute Analysis View

EHR timestamp에는 동일 시각에 여러 record가 몰리는 batch entry가 많다. ICU charting에서는 같은 timestamp에 여러 measurement가 기록되거나 짧은 간격으로 반복 record가 생성될 수 있다.

Process mining을 위한 compact view에서는 L1/L2 abstraction과 5-minute aggregation을 함께 사용했다.

| View | Events | Reduction from L0 |
|---|---:|---:|
| Baseline L0 event log | 76,062,216 | - |
| L1 + 5-minute view | 13,617,405 | 82.1% |
| L2 + 5-minute view | 10,483,531 | 86.2% |

이 reduction은 raw activity grouping과 short-window repeated event aggregation이 결합된 결과다. 다만 5-minute window는 모든 분석 질문에 적용되는 universal rule이 아니라, 이 프로젝트에서 representative analysis view로 사용한 설정이다.

## 7. Abstraction과 Validation의 연결

Activity abstraction은 validation과 분리되지 않는다. Batch timestamp가 많은 source는 aggregation window의 영향을 크게 받는다. Cross-table redundancy가 있는 source는 같은 L1/L2 label로 묶일 때 over-counting이 생길 수 있다. `chartevents`처럼 high-volume source는 frequency 해석에 주의가 필요하다.

따라서 L0/L1/L2는 하나의 정답 hierarchy가 아니라 서로 다른 질문에 답하는 view로 보았다.

| View | Good for | Not good for |
|---|---|---|
| L0 | audit, source validation, exact provenance | readable process model |
| L1 | main process flow, category-level comparison | very high-level summary |
| L2 | compact overview, scale control | detailed clinical interpretation |

## 정리

Activity abstraction은 raw detail을 제거하는 단계가 아니라, source-native provenance와 analysis readability를 분리하는 단계였다. Baseline L0 event log는 audit trail로 보존하고, L1/L2 + 5-minute view는 process mining을 위한 derived view로 구성했다.

이 abstraction 결과는 이후 validation에서 다룬 batch timestamp, cross-table redundancy, high-volume charting issue와 직접 연결된다.

## 관련 자료

- GitHub 문서: [docs/04_activity_abstraction.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/04_activity_abstraction.md)
- Notebook: [research_notebooks/04_activity_abstraction.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/04_activity_abstraction.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
