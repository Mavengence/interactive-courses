# Interactive Courses

Four interactive, zero-signup courses on data engineering, data science, infrastructure, and AI-assisted development. Built as static HTML/CSS/JS — open any `index.html` in a browser and start learning.

**Live at [timloehr.me/interactive-courses](https://timloehr.me/interactive-courses)**

---

## Courses

### 01 · Data Engineering Fundamentals
Build production-grade data pipelines from the ground up. Covers ETL patterns, batch and streaming architectures, and the tools used by data teams at scale.

**Stack:** Python · SQL · Airflow · dbt · Spark · Kafka

→ [`./data-engineering-fundamentals/`](./data-engineering-fundamentals/)

---

### 02 · Data Science Fundamentals
From exploratory analysis to model deployment. Covers statistical thinking, ML fundamentals, and communicating insights that drive decisions.

**Stack:** Python · pandas · scikit-learn · PyTorch · MLflow

→ [`./data-science/`](./data-science/)

---

### 03 · Data Infrastructure
Design and operate cloud-native data platforms. Covers warehousing, lakehouse architectures, infrastructure-as-code, and reliability engineering for big data systems.

**Stack:** Snowflake · BigQuery · Terraform · Docker · Kubernetes

→ [`./data-infrastructure/`](./data-infrastructure/)

---

### 04 · AI Coding with Claude
Ship production software faster with AI-assisted development. Covers prompt engineering for code, agentic workflows, and maintaining quality while moving at speed.

**Stack:** Claude · Claude Code · MCP · Agents · Evals

→ [`./codex/`](./codex/)

---

## Running Locally

No build step required.

```bash
git clone https://github.com/Mavengence/interactive-courses.git
cd interactive-courses
open index.html   # macOS
# or: python3 -m http.server 8080
```

Each course directory contains its own `index.html` — open it directly in any modern browser.

---

## License

MIT — free to use, adapt, and share.
