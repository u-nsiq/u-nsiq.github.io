---
title: Lab Intern
---

학부 시절 연구실에서 진행한 인턴 활동을 기록한 공간입니다.

---

## [DataLab] MIMIC-IV Sepsis 이벤트 로그 구축 (2025.07 ~ 2026.02)

Data Analytics Lab. 연구실에서 7개월간 진행한 학부연구생 활동.
MIMIC-IV / eICU 데이터를 기반으로 패혈증 환자 코호트를 구축하고,
프로세스 마이닝 도구에 바로 투입 가능한 이벤트 로그를 설계·구축한 과정을 기록했습니다.

1. [MIMIC-IV에서 패혈증 코호트 만들기 — Sepsis-3 기준과 hadm_id 선택 근거](./01-cohort)
2. [임상 이벤트 로그의 추상화 — L0/L1/L2 계층 설계](./02-abstraction)
3. [10개 테이블을 하나의 이벤트 로그로 — 구축 과정과 설계 결정들](./03-build)
4. [임상 데이터의 불완전함 — Suriadi 11패턴으로 MIMIC-IV 검증하기](./04-quality)
5. [SQLite에서 BigQuery로, MIMIC-IV에서 eICU로 — 확장의 이유와 과정](./05-bigquery-eicu)
