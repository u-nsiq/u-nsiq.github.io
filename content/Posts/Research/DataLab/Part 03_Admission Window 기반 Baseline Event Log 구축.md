---
title: "Part 03. Admission Window 기반 Baseline Event Log 구축"
date: 2026-03-31
modified: 2026-04-28
draft: false
---

## 들어가며

앞선 글에서는 MIMIC-IV source table을 event log schema로 변환하기 위한 case notion과 source selection을 정리했다. 이후 단계에서는 이 설계를 실제 baseline event log로 구성해야 했다.

Baseline event log construction은 source table을 단순히 `UNION ALL`하는 작업으로 끝나지 않았다. Admission-level trace를 구성하려면 event timestamp가 admission window 안에 있어야 하고, ICU event는 해당 ICU stay window와도 맞아야 한다.

이 글에서는 Master Window, Child Window, Strict Filtering을 중심으로 baseline L0 event log를 구축한 과정을 설명한다.

## 이 글에서 다루는 것

- Master Window와 TRUE_END rule
- ICU stay-level Child Window
- capping 대신 strict filtering을 사용한 이유
- baseline L0 event log의 source distribution
- baseline, refinement branch, analysis view의 stage 구분

---

## 1. Baseline Construction의 Input과 Output

Baseline construction은 cohort, source events, conversion rule, window rule을 결합하는 단계였다.

| Layer | Meaning |
|---|---|
| cohort table | ICD-10-CM A40/A41 sepsis admission cohort |
| source event tables | 10 MIMIC-IV source tables |
| conversion rules | boundary pair / movement pair / duration-like pair / one-off |
| window rules | Master Window and Child Window |
| baseline L0 event log | source-native event log after cohort/window rules |

최종 baseline artifact는 다음과 같이 정리했다.

| Metric | Value |
|---|---:|
| Admissions | 13,471 |
| Patients | 11,081 |
| Baseline L0 events | 76,062,216 |

여기서 baseline L0 event log는 source-native detail을 보존한 artifact다. Process mining에 바로 사용할 compact view라기보다, 이후 validation과 abstraction의 기준이 되는 construction result에 가깝다.

## 2. Master Window

Master Window는 admission-level valid time range다.

```text
Master Window = [admittime, TRUE_END]
TRUE_END = COALESCE(deathtime, dischtime)
```

`dischtime`만 종료 시점으로 사용하지 않고 `TRUE_END`를 둔 이유는 사망 시간이 있는 admission에서 `deathtime`이 clinical journey의 실질 종료에 더 가까울 수 있기 때문이다. `deathtime`이 있으면 이를 우선 사용하고, 없으면 `dischtime`을 사용했다.

이 rule을 적용했을 때 `admittime > TRUE_END`인 admission 1건이 발견되었다. 이 case는 논리적으로 invalid하다고 보고 baseline event log cohort에서 제외했다.

| Stage | Count |
|---|---:|
| Pre-event-log ICD-10-CM cohort | 13,472 admissions |
| Removed by Master Window logic | 1 admission |
| Baseline event log cohort | 13,471 admissions |

이 1건은 전체 규모에서는 작지만, case boundary validation 관점에서는 제외하는 것이 일관적이었다.

## 3. Child Window

`hadm_id`를 top-level case로 사용하더라도 ICU event의 context는 별도로 확인해야 했다. `stay_id`가 연결된 event는 해당 ICU stay의 `intime`과 `outtime` 사이에 있어야 한다.

```text
Child Window = [icustays.intime, icustays.outtime]
```

Child Window는 admission-level journey와 ICU-level context를 함께 유지하기 위한 rule이다. `hadm_id` trace 안에 들어오는 event라도, ICU-specific event가 해당 stay 밖에 있으면 context 해석이 흔들릴 수 있다.

일부 `icustays.outtime`이 NULL인 terminal case는 `TRUE_END`로 보간했다. Overlapping ICU stay는 없는 것으로 확인했고, stay-linked event가 Child Window 밖에 있는 경우에는 filtering을 적용했다.

## 4. Strict Filtering

Window 밖 event를 처리하는 방식으로 capping과 strict filtering을 비교했다.

| Option | Meaning | Risk |
|---|---|---|
| Capping | event timestamp를 admission/stay boundary로 이동 | event ordering과 timestamp meaning 왜곡 |
| Strict Filtering | valid window 밖 event 제거 | event loss 발생 |

Capping은 event loss를 줄일 수 있지만, timestamp의 의미를 바꾼다. Process mining에서는 timestamp가 trace ordering의 기준이므로, 실제 기록된 시간을 window boundary로 이동시키는 방식은 사용하지 않았다.

최종적으로는 strict filtering을 선택했다. Window 밖 event는 제거하되, 남은 event의 timestamp meaning을 보존하는 방식이다.

정리한 construction rule set은 다음과 같다.

| Rule | Decision | Meaning |
|---|---|---|
| TRUE_END | `COALESCE(deathtime, dischtime)` | admission endpoint definition |
| Cohort exclusion | remove `admittime > TRUE_END` | logically invalid admission |
| Reversed duration | remove invalid duration rows | e.g., `endtime < starttime` |
| ICU outtime imputation | impute selected terminal `outtime` NULL cases | preserve bounded terminal ICU stay |
| Child Window integrity | check overlap and stay-level bounds | ICU context validity |
| Strict Filtering | remove events outside Master/Child Window | preserve timestamp meaning |

## 5. Baseline Source Distribution

Baseline L0 event log의 source distribution은 다음과 같다.

| Source table | Events | Share |
|---|---:|---:|
| `chartevents` | 55,347,183 | 72.77% |
| `labevents` | 9,753,413 | 12.82% |
| `emar` | 7,354,918 | 9.67% |
| `inputevents` | 2,601,270 | 3.42% |
| `outputevents` | 554,814 | 0.73% |
| `microbiologyevents` | 243,834 | 0.32% |
| `procedureevents` | 123,650 | 0.16% |
| `transfers` | 41,012 | 0.05% |
| `admissions` | 26,942 | 0.04% |
| `icustays` | 15,180 | 0.02% |

Source distribution상 `chartevents`가 baseline event log 규모의 대부분을 차지했다. 이 count는 ICU monitoring과 documentation의 밀도를 반영하지만, 곧바로 clinical decision frequency로 해석할 수는 없다.

## 6. Refinement Branch

Baseline L0 event log와 별도로 refinement branch도 진행했다. 이 branch에서는 exact duplicate rows, resource 값만 다른 duplicate-like groups, `icustays`와 `transfers`의 same timestamp/location overlap, NULL timestamp rows, ordering rule 등을 확인했다.

대표적으로 exact duplicate merge 단계에서 112,098,967 rows가 21,671,759 rows로 줄어드는 branch가 있었다. 이후 resource conflict merge, ICU/transfer duplicate removal, NULL timestamp removal 등을 거치며 약 21.1M 규모의 refined branch를 만들었다.

이 숫자는 baseline L0 event log의 headline number로 사용하지 않았다. Refinement branch는 duplicate와 redundancy behavior를 이해하기 위한 별도 construction path로 분리했다.

## 7. Analysis View

Baseline L0 event log는 source-native detail을 보존하기 때문에 그대로 process mining model에 넣기에는 크고 복잡하다. 따라서 L1/L2 activity abstraction과 5-minute aggregation을 적용한 analysis-level view를 별도로 구성했다.

| View | Events | Role |
|---|---:|---|
| Baseline L0 event log | 76,062,216 | source-native audit trail |
| L1 + 5-minute view | 13,617,405 | category-level intermediate view |
| L2 + 5-minute view | 10,483,531 | compact analysis view |

`10,483,531 events`는 baseline L0를 대체하는 값이 아니라, process mining analysis에 맞춘 derived view다.

## 8. BigQuery Raw Integration

후반부에는 SQLite/notebook 중심 작업을 BigQuery 기반으로 정리했다. Corrected BigQuery raw integration stage에서는 111,208,580 rows 규모의 raw event extraction workflow를 구성했다.

이 값은 baseline L0 event log count와 같은 stage가 아니다.

| Count | Stage |
|---:|---|
| 111,208,580 rows | BigQuery raw integration |
| 76,062,216 events | baseline L0 event log |
| 10,483,531 events | L2 + 5-minute analysis view |

따라서 event count는 항상 stage label과 함께 표기했다.

## 정리

Baseline event log construction은 source table integration과 window validation을 함께 수행한 단계였다. Admission-level Master Window, ICU-level Child Window, Strict Filtering을 적용해 baseline L0 event log를 구성했다.

이 baseline artifact를 기준으로 이후 activity abstraction, validation, analysis view construction이 이어졌다.

## 관련 자료

- GitHub 문서: [docs/03_baseline_construction.md](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/docs/03_baseline_construction.md)
- Notebook: [research_notebooks/03_baseline_construction.ipynb](https://github.com/u-nsiq/clinical-event-log-process-mining/blob/main/research_notebooks/03_baseline_construction.ipynb)
- Repository: [clinical-event-log-process-mining](https://github.com/u-nsiq/clinical-event-log-process-mining)
