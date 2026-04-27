---
title: "Part 06. eICU-CRD Extension과 Dataset Generalization"
date: 2026-04-10
modified: 2026-04-28
draft: false
---

## 들어가며

마지막 단계에서는 MIMIC-IV에서 정리한 event log construction framework를 eICU-CRD에 적용했다. 이 작업은 MIMIC-IV와 eICU-CRD를 동일한 깊이로 비교 분석했다는 의미가 아니라, 서로 다른 ICU EHR dataset에서도 같은 construction 질문이 반복되는지 확인한 확장 사례에 가깝다.

MIMIC-IV가 main construction dataset이었다면, eICU-CRD는 schema와 timestamp model이 다른 dataset에 대한 적용 가능성을 확인하는 대상이었다. 특히 eICU-CRD는 offset-based timestamp를 사용하므로, event source extraction 전에 timestamp axis를 재구성해야 했다.

이 글에서는 eICU extension에서 cohort definition, timestamp transformation, source mapping을 어떻게 다뤘는지 정리한다.

## 이 글에서 다루는 것

- MIMIC-IV와 eICU-CRD의 dataset 구조 차이
- eICU sepsis cohort definition
- offset timestamp transformation
- MIMIC-IV에서 일반화된 construction principle
- eICU extension의 scope boundary

---

## 1. eICU-CRD를 확장 대상으로 본 이유

MIMIC-IV는 single-center style public ICU EHR dataset이고, eICU-CRD는 multi-center ICU database다. 둘 다 public credentialed EHR dataset이지만 table structure와 timestamp model이 다르다.

eICU-CRD를 본 목적은 MIMIC-IV에서 정리한 event log construction 질문이 다른 ICU dataset에서도 유효한지 확인하는 것이었다.

주요 질문은 다음과 같았다.

- case notion을 dataset별 schema에 맞게 다시 정의할 수 있는가?
- offset timestamp를 process mining event ordering에 사용할 수 있는 timestamp로 변환할 수 있는가?
- diagnosis code, event source, activity abstraction이 dataset에 따라 어떻게 달라지는가?
- BigQuery/YAML-driven pipeline structure가 다른 schema에도 적용 가능한가?

## 2. Dataset Difference

MIMIC-IV와 eICU-CRD는 단순히 table name만 다른 것이 아니라, 기본 단위와 timestamp model이 다르다.

| Aspect | MIMIC-IV | eICU-CRD |
|---|---|---|
| Institution structure | single-center style public ICU EHR | multi-center ICU database |
| Main unit | hospital admission + ICU stay | ICU unit stay 중심 |
| Timestamp | shifted absolute datetime | offset-based time fields |
| Case identifier | `hadm_id` with `stay_id` context | `patientunitstayid` 중심 |
| Diagnosis coding | ICD-10-CM for final cohort | ICD-9 style sepsis codes |
| Main construction issue | window filtering, source redundancy | timestamp reconstruction, ICU-only scope |

MIMIC-IV에서는 `hadm_id`를 top-level case로 두고 `stay_id`를 context로 보존했다. eICU-CRD에서는 ICU unit stay 중심 구조가 더 강하므로 `patientunitstayid`가 중요한 단위가 된다.

따라서 MIMIC-IV SQL을 그대로 옮기는 방식은 적절하지 않았다. Case boundary, timestamp transformation, source mapping을 dataset에 맞게 다시 설정해야 했다.

## 3. eICU Sepsis Cohort Definition

eICU sepsis cohort는 ICD-9 based sepsis-related code를 기준으로 정의했다.

| Code family | Meaning |
|---|---|
| `038.%` | septicemia |
| `995.91` | sepsis |
| `995.92` | severe sepsis |
| `785.52` | septic shock |

확인된 cohort 규모는 다음과 같다.

| Unit | Count |
|---|---:|
| ICU stays | 15,731 |
| Hospital admissions | 14,351 |
| Patients | 13,420 |

이 count는 MIMIC-IV의 `hadm_id` 기반 admission cohort와 직접 비교할 수 없다. MIMIC-IV와 eICU-CRD는 case boundary가 다르기 때문에, cohort count도 dataset-specific unit과 함께 해석해야 한다.

## 4. Offset Timestamp Transformation

eICU-CRD의 주요 차이는 timestamp다. MIMIC-IV는 shifted absolute datetime을 제공하지만, eICU-CRD는 많은 time field가 ICU admission 또는 hospital event를 기준으로 한 offset 형태로 기록된다.

Process mining event log를 만들려면 event를 공통 time axis 위에 놓아야 한다. 따라서 offset field를 absolute-like timestamp로 변환하는 과정이 필요했다.

기본 아이디어는 다음과 같다.

```text
anchor time + offset minutes = event timestamp
```

여기서 핵심은 anchor time을 어떻게 설정할지다. eICU에서는 hospital discharge 관련 offset을 이용해 time axis를 재구성하는 방식으로 접근했다. 변환 후에는 다시 offset을 계산해 원본과 비교하는 round-trip consistency check를 수행했다.

| Check | Result |
|---|---:|
| Unit discharge offset round-trip consistency | 99.9% |

이 결과는 timestamp transformation이 대체로 안정적으로 작동했음을 나타낸다. 다만 이 값은 downstream event log validation까지 완료했다는 의미는 아니다.

## 5. Event Source Mapping

MIMIC-IV에서 사용한 10-source event log structure를 참고하되, eICU-CRD의 table structure에 맞춰 source mapping을 다시 검토했다.

MIMIC-IV에서 사용한 질문은 eICU에서도 반복되었다.

| MIMIC-IV question | eICU version |
|---|---|
| admission boundary는 어디서 오는가? | unit stay and discharge fields |
| lab event는 어떤 table에서 오는가? | lab-related eICU tables |
| medication event는 order인가 administration인가? | medication table semantics 확인 |
| vital/charting source를 포함할 것인가? | high-volume periodic charting source 검토 |
| procedure/input/output은 timestamp가 어떻게 기록되는가? | offset fields and event semantics 확인 |

즉, dataset이 바뀌어도 먼저 case boundary를 정하고, event와 attribute를 분리하고, timestamp 의미를 확인하고, source provenance를 보존해야 한다는 흐름은 유지되었다.

## 6. Raw Event Log Construction Direction

eICU-CRD에서도 기본 construction pattern은 다음과 같았다.

```text
source-specific extraction
  -> normalized event schema
  -> timestamp transformation
  -> cohort/case linkage
  -> UNION ALL
  -> raw event log
```

다만 MIMIC-IV와 달리 timestamp transformation이 앞단에서 중요한 step이 된다. Offset time field를 그대로 두면 여러 source event를 공통 ordering 기준으로 통합하기 어렵기 때문이다.

후반 작업에서는 eICU-CRD에서도 MIMIC-IV 구조에 대응해 10개 source table을 대상으로 raw event log construction 방향을 세웠다. 그러나 이 repository에서는 eICU-CRD를 MIMIC-IV와 같은 깊이의 fully validated artifact로 두지 않았다.

## 7. Generalized Principles

MIMIC-IV에서 정리한 다음 원칙은 eICU-CRD에서도 적용 가능했다.

| Principle | eICU relevance |
|---|---|
| define case notion before extraction | ICU stay 중심 구조에서 더 중요 |
| separate event/source/attribute | diagnosis and score tables를 event로 오해하지 않기 |
| preserve source provenance | multi-table mapping에서 필요 |
| distinguish raw/baseline/analysis stages | count 해석 혼동 방지 |
| validate timestamp meaning | offset model 때문에 특히 중요 |
| treat high-volume charting carefully | periodic logging 가능성 |

이 원칙은 특정 SQL이나 table name보다 상위의 construction framework에 가깝다.

## 8. Non-Transferred Logic

반대로 MIMIC-IV의 logic을 그대로 적용할 수 없는 부분도 있었다.

| MIMIC-IV logic | eICU issue |
|---|---|
| `hadm_id` as case | eICU는 ICU unit stay 중심 |
| absolute datetime window | offset timestamp reconstruction 필요 |
| ICD-10-CM A40/A41 | ICD-9 based sepsis codes 사용 |
| MIMIC metadata categories | eICU-specific metadata/category 필요 |
| MIMIC `chartevents` policy | eICU charting/vital source 별도 검토 필요 |

따라서 eICU extension은 pipeline을 그대로 복사한 작업이 아니라, 같은 design framework를 다른 schema에 맞춰 다시 적용한 작업으로 보는 것이 적절하다.

## 9. Scope Boundary

eICU extension에서 완료된 범위와 보류한 범위는 다음과 같이 구분했다.

| Area | Status |
|---|---|
| sepsis cohort definition | completed at cohort-count level |
| timestamp transformation | completed with consistency check |
| raw event log construction direction | established |
| full L1/L2 abstraction | not claimed as complete |
| full Suriadi-style validation | not claimed as complete |
| direct MIMIC-IV vs eICU process comparison | not claimed as complete |

이 구분은 eICU-CRD를 MIMIC-IV와 같은 깊이의 final artifact로 과장하지 않기 위한 boundary다. eICU는 multi-dataset extension 가능성을 확인한 사례로 정리했다.

## 정리

eICU-CRD extension에서 확인한 점은 event log construction이 특정 SQL을 그대로 복사하는 작업이 아니라는 것이다. Dataset이 바뀌면 case notion, timestamp model, diagnosis coding system, source table semantics가 모두 달라진다.

MIMIC-IV에서 정리한 질문들은 eICU-CRD에서도 유효했다. 다만 답은 eICU schema와 offset timestamp model에 맞춰 다시 정해야 했다.

## 관련 자료

- GitHub 문서: [docs/06_eicu_extension.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/06_eicu_extension.md)
- Notebook: [research_notebooks/06_eicu_extension.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/06_eicu_extension.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
