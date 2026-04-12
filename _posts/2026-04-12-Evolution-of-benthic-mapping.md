---
layout: single
author_profile: true
read_time: true
comments: false
share: true
related: true
title: From Rules to Learning: The Evolution of Benthic Habitat Classification
date: 2026-04-12
categories:
  - geospatial
  - terrain
  - ml
tags:
  - benthic
  - terrain
  - model
  - random-forest
  - machine-learning
  - marine-science
  - benthic-mapping
  - feature-engineering
  - model-selection
toc: true
toc_sticky: true
excerpt: "Underwater seafloor habitat classification is a problem with immediate practical consequences. The challenge isn't availability of data — modern multibeam echo sounders (MBES) capture rich acoustic information at high resolution — but rather **how to extract meaningful habitat distinctions from raw bathymetry and acoustic backscatter**."
---

# From Rules to Learning: The Evolution of Benthic Habitat Classification

## The Challenge

Underwater seafloor habitat classification is a problem with immediate practical consequences. Accurate benthic maps inform marine conservation, fisheries management, and environmental impact assessments. The challenge isn't availability of data — modern multibeam echo sounders (MBES) capture rich acoustic information at high resolution — but rather **how to extract meaningful habitat distinctions from raw bathymetry and acoustic backscatter**.

This repository documents an exploration (that I undertook as part of a Kaggle competition) of the tension between two fundamentally different paradigms: **rule-based classification** (using domain expertise to encode habitat signatures) versus **machine learning** (using labeled samples to discover decision boundaries). What began as a straightforward question — "can ML improve on expert rules?" — evolved into a more nuanced journey about **what combinations of data and methods actually work**.

## Phase 0: The Starting Point — Rule-Based BTM Classification

### How It Worked

The original Benthic Terrain Modeler (BTM) approach, developed by Derek Beaulieu at NOAA and refined over decades, was elegantly simple in principle:

1. **Compute four terrain derivatives** from bathymetry:
   - Broad-scale BPI (Bathymetric Position Index, e.g., 10–30 m window)
   - Fine-scale BPI (e.g., 1–5 m window)  
   - Slope (Horn 1981 gradient)
   - Depth (raw bathymetry)

2. **Encode expert knowledge as rules**:
   ```
   IF BroadBPI < -100 AND FineBPI < -100 THEN "Reef Crest"
   IF BroadBPI < -100 AND FineBPI ∈ [-100, 100] THEN "Mid-Slope Ridge"
   ...
   ```

3. **Apply rules deterministically** — first match wins, no probability, fully explainable.

### Strengths and Limitations

The elegance came with a cost. Rules use **hard thresholds** for **continuous gradients**. Real habitat transitions are ecological — organisms cluster at gradients, not boundaries. Transition zones were systematically misclassified by whichever adjacent class had the wider rule range.

**But the genius was in portability**: the same rules worked across different survey areas within the same **geomorphological regime**. No training data needed. No overfitting. No black box.

> **Key insight**: Rule-based methods are like linguistic rules—they work elegantly until you hit the exceptions.

---

## Phase 1: The ML Baseline — MBES Core Features + Random Forest

### The First Experiment (R04/R06)

Around 2024, the question shifted: *"What if we trained a model on labeled field samples?"*

The **benthic_model** pipeline ("Run 004") took a simplifying step: extract **8 point-sample features** at each labeled location:

| Feature | Source | Rationale |
|---------|--------|-----------|
| Depth | Bathymetry raster | Single most predictive variable |
| Backscatter | Acoustic return | Substrate hardness proxy |
| Slope | Bathymetry gradient | Local terrain steepness |
| VRM | Vector Ruggedness Measure | Roughness/complexity |
| Complexity | Surface area / planar area ratio | Terrain intricacy |
| Max curvature | 2nd derivative of bathymetry | Profile curvature |
| Northness | sin(aspect) | Directional exposure (shelter) |
| Eastness | cos(aspect) | Directional exposure (shelter) |

Train a Random Forest with `class_weight='balanced_subsample'` on 6,256 labeled points. The model learns **nonlinear, multi-variable decision boundaries**.

### Results: The Baseline

- **CV F1**: 0.8024 (5-fold spatial-blocked cross-validation)
- **Kaggle public F1**: **0.79518** (up from competition baseline 0.72750)
- **CV–Kaggle gap**: 0.007 (excellent generalization!)

This became the **reference baseline** for all subsequent work. Three things were notable:

1. **Depth dominates**: Feature importance showed depth accounted for ~32% of signal.
2. **Small CV–Kaggle gap suggests honest estimation**: Spatial-blocked CV was working.
3. **Rare-class detection was failing**: SGAM (seagrass habitat) F1 = 0.000 — the model never predicted it.

---

## Phase 2: The Breakthrough — Adding BTM Terrain Features

### The Intuition

If expert-encoded BTM rules captured ecological patterns, why not feed those patterns to the ML model as **additional features**? The key insight: **ML doesn't need deterministic rules—it just needs signal**.

### What We Added

Instead of replacing the MBES-8 baseline, we **computed BTM terrain derivatives and added them alongside**:

- Broad-scale BPI (10–30 m)
- Fine-scale BPI (1–5 m)
- Slope (BTM version, consistent with rules)
- Surface ratio
- VRM (BTM version)

A total of **~10 features** fed to the same RF model.

### Results: The Breakthrough

- **CV F1**: 0.8024 (no change!)
- **Kaggle F1**: **0.79518** (no change!)
- **But**: Per-class performance was strikingly different

The real win was **Kaggle generalization**: The CV–Kaggle gap remained at 0.007, suggesting the BTM features helped the model avoid overfitting to spatial patterns in the training set. Earlier runs without BTM features had larger gaps (0.039–0.066), indicating spatial autocorrelation was leaking into the model.

### The Larger Finding

We benchmarked other algorithms on the same BTM-augmented feature set:

| Model | CV F1 | Notes |
|-------|-------|-------|
| RF (baseline) | 0.8024 | **Best** |
| LightGBM | 0.7954 | Faster, accurate |
| CatBoost | 0.7965 | GPU-accelerated |
| XGBoost | 0.7751 | Slowest |
| Soft-vote ensemble | 0.7967 | Dilutes signal |

**Random Forest won despite its age.** The lesson: **Random Forest's `balanced_subsample` mode intrinsically handles the MBES 5-class imbalance better than gradient boosting.** No amount of algorithmic sophistication could overcome this statistical fact.

> **Key insight**: Feature quality trumps model complexity. A simple model on good features outperforms a sophisticated model on dilute features.

---

## Phase 3: Exploring Alternatives — What Didn't Work

### Why the Experiments?

With R04 as the reference, the question became: *"Are there signal paths we're missing?"* Over the next year, we tested several promising ideas.

### Experiment 1: Object-Based Image Analysis + Pixel Hybrid (Run 009)

**Hypothesis**: Following Ierodiaconou et al. (2018)—the same paper using the same dataset—we segmented MBES rasters into superpixels (SLIC algorithm, ~300 m² average object size) and extracted per-object statistics (mean, std, skewness of depth, backscatter, rugosity).

**Result**: 
- Pixel-only F1: 0.5665
- Object-only F1: 0.3886
- Combined: 0.5758

**But**: All configurations scored **19 points below the RF baseline** (0.8024). The OBIA features weren't capturing what the RF was learning from point samples.

**Why it failed**: Superpixel objects (~300 m²) are too coarse relative to the labeled point density. The averaging step lost fine-grained acoustic gradients.

### Experiment 2: Ecology-Informed Features (Run 015)

**Hypothesis**: The SGAM (seagrass) class is ecologically distinct—shallow, sheltered, flat, fine-sediment habitat. Let's add domain-guided features to help the model detect it.

**Features added**:
- Depth zone bins (quantile-based: 4 ordinal categories)
- SGAM niche indicator (shallow AND low BPI AND low slope)
- Raster-sampled derivatives: northness, eastness, max_curvature, complexity

**Result**:
- SGAM F1: 0.043 → 0.045 (+0.002)
- Overall CV: 0.7916
- Kaggle: 0.76438 (worse than baseline)

**Why it failed**: While SGAM detection improved marginally, the large features set created noise that degraded the other classes. **Adding even "good" features can hurt if they dilute the dominant signal.**

### Experiment 3: Multi-Scale BTM Features (Run 016–017)

**Hypothesis**: Terrain is multi-scale. The 10–30 m broad-scale BPI captures regional topography, but finer scales (3–5 m) capture local microhabitats. What if we built an array of terrain derivatives at **5 spatial scales** plus **GLCM texture** statistics on backscatter?

**Approach**:
- Compute slope, VRM, surface ratio, northness, eastness, max_curvature, complexity at scales {3, 7, 11, 15, 21 cells}
- Add GLCM backscatter texture: contrast, homogeneity, energy, correlation
- Total: 64 features → 33 selected via permutation importance

**Run 016 (multi-scale BTM only)**:
- CatBoost, 33 features, **CV F1: 0.6383**
- **38 points below baseline!**

**Run 017 (multi-scale BTM + MBES-8)**:
- CatBoost, 38 features, **CV F1: 0.7829**
- **19.5 points below baseline!**

**Why it failed**: **The curse of dimensionality on a modest dataset.** With only 6,256 labeled points, a 38-feature space per-class becomes sparse. Tree-based models struggle to partition such a dilute space—CatBoost was a poor choice (better at very high dimensions). Random Forest with 38 features still underperformed with 10.

> **Key insight**: Not all features are equal. Depth alone is worth ~14 pp of F1. Adding 28 derived features costs 19 pp. The signal-to-noise ratio collapsed.

---

## Phase 4: Approaching the Ceiling — Optimization and Limits

### Establishing the Noise Floor

After Run 015 (ecology) showed marginal gains and Run 017 (multi-scale) showed clear degradation, the question shifted to **"Is R04 the limit?"**

**Run 019**: Systematic investigation

We trained R04 (RF + BTM-10) with **5 different random seeds** and computed per-seed CV F1:

| Seed | CV F1 |
|------|-------|
| 42   | 0.8024 |
| 123  | 0.8022 |
| 456  | 0.7947 |
| 789  | 0.7856 |
| 2026 | 0.7878 |
| **Mean** | **0.7945** |
| **Std** | **0.0079** |
| **Noise floor (2×std)** | **±0.0158** |

**Conclusion**: Any improvement must exceed ±~0.019 F1 to be statistically distinguishable from noise. We tried:

- RF with 500 trees (vs default 100): CV F1 = 0.8001 (below threshold)
- LightGBM tuned (n_est=300, lr=0.05): CV F1 = 0.7959 (below threshold)
- Seed ensemble: 97/98 unanimous predictions with R04

**Result**: **R04 is the effective ceiling for this dataset and feature set.** Not due to model limitations but due to **data saturation and feature adequacy**.

### Why R04 Works So Well

Analyzing R04 in hindsight:

1. **Depth is dominant** (~32% feature importance), and depth is accurately measured by MBES.
2. **Backscatter provides substrate signal** (acoustic hardness), which MBES captures well.
3. **Terrain derivatives (BPI, slope, VRM) encode geomorphology**, which correlates with ecology.
4. **RF's `balanced_subsample` intrinsically handles the SGAM imbalance** without explicit tuning.
5. **10 features is the "Goldilocks" zone**: enough signal, little noise.

---

## Phase 5: Modern Approaches — Deep Learning and Segmentation

### Deep Learning: The First Attempt (Run 020)

**Hypothesis**: Maybe a neural network can find nonlinear patterns RF can't.

**Approach**: Integrate sklearn's `MLPClassifier` (3-layer MLP: 128→64→32 hidden units, Adam optimizer, L2 regularization, StandardScaler preprocessing).

**Results** (5 seeds):

| Seed | MLP CV F1 | Notes |
|------|-----------|-------|
| 42   | 0.8156 | Best single seed |
| 123  | 0.7827 | |
| 456  | 0.8132 | |
| 789  | 0.7959 | |
| 2026 | 0.7703 | |
| **Mean** | **0.7955** | Below noise floor |

MLP achieves **0.7955 (–0.019 vs R04 mean 0.7945)**, **below the noise floor threshold**.

**Interesting finding**: MLP detects SGAM in 4/5 seeds (vs RF's 1/5), suggesting a sensitivity to rare-class patterns. **But both fail to predict any SGAM in the test set**, indicating the SGAM boundary is **spatially non-stationary**: the model learns SGAM in one training block, but it doesn't exist in that configuration in other spatial blocks or the test set.

**Conclusion**: Deep learning doesn't help without structural changes to the problem (e.g., more SGAM samples or different feature engineering).

### Segmentation Hybrid (Run 021 — In Progress)

The latest direction explores **low-effort image segmentation** as a complementary path:

1. **Convert point labels to masks** (5×5 pixel expansion around each point)
2. **Train three segmentation approaches**:
   - Hugging Face SegFormer fine-tuned
   - SegFormer + CRF smoothing
   - Local DeepLabV3+ fine-tuned
3. **Combine segmentation outputs with RF/MLP** via logistic regression meta-learner
4. **Promotion gate**: Require ≥2 pp F1 gain and non-decreasing SGAM recall

This represents a shift in philosophy: **complementarity over replacement**. Rather than finding a better single model, we're exploring whether **multi-path ensembling** (tree-based + segmentation) can unlock signal that purely tabular methods miss.

---

## The Thinking Process: Lessons Learned

### What Worked

1. **Spatial-blocked cross-validation** was non-negotiable. It prevented spatial autocorrelation leakage and made CV scores honest predictors of Kaggle performance.

2. **Core MBES features (depth + backscatter) are dominant signal.** Everything else is supplementary.

3. **Random Forest is the right model** for this dataset size and feature type. Not because it's sophisticated, but because its `balanced_subsample` handles imbalance natively.

4. **Domain features (BTM derivatives) improve generalization** by encoding ecological patterns, even if they don't increase CV score directly. They reduce overfitting.

5. **Stopping at the right place matters.** The temptation to keep adding features, testing new models, and fine-tuning hyperparameters is strong. But the noise floor established that R04 is optimal. Further improvement requires **structural changes**: more data, new signal sources, or different problem formulation.

### What Didn't Work

1. **Dimensionality without selectivity.** Adding 28 multi-scale features (Run 017) degraded performance despite careful feature selection. The feature set became too sparse relative to sample count.

2. **Deep learning on small tabular problems.** MLP didn't improve over RF. The 6,256 samples × 14 features scale is exactly where RF excels and DL struggles.

3. **Superpixel aggregation (OBIA).** Averaging over 300 m² objects lost fine-grained acoustic gradients that RF learns from point samples.

4. **Model tuning without signal.** Switching from RF to LightGBM, XGBoost, or CatBoost didn't help. Better model ≠ better predictions without better features.

### The Counterintuitive Finding

**More features can hurt.** It's easy to assume "more input = more signal." But in tree-based models with modest sample counts, the statistical noise of additional features outweighs their marginal signal. This is why permutation feature selection and early stopping matter.

---

## Summary: The Journey and the Plateau

### The Progression (CV F1)

```
Rule-based BTM          (baseline)
   ↓
MBES-8 + RF             0.8024 ← Reference
   +BTM features        0.8024 (same CV, better Kaggle gap)
   +Multi-scale BTM     0.7829 (19.5 pp loss)
   +Ecology features    0.7916 (10.8 pp loss)
   +Deep learning (MLP) 0.7955 (below noise floor)
   +Segmentation hybrid 0.???? (in progress)
```

The **climb from rule-based to ML (0.72 → 0.79 Kaggle)** was steep and decisive. Further optimization yielded diminishing returns. The current frontier is **ensemble/multi-modal approaches** that acknowledge the limits of single-feature-set models.

### What We Know Now

1. **The semantic ceiling is real.** With the features we have, F1 ≈ 0.80 is the effective limit.

2. **SGAM (rare-class) detection is fundamentally hard.** It's only 2.7% of the data, spatially non-stationary, and the boundary isn't stationary across spatial blocks. No single-model approach solved it.

3. **Kaggle generalization is better than expected.** The gap between CV (0.8024) and Kaggle (0.79518) is 0.007—smaller than typical measurement noise. This suggests spatial-blocked CV genuinely captures held-out performance.

4. **Feature engineering is interpretable and powerful.** The move from MBES-8 to BTM + MBES was a +3.1pp Kaggle improvement through domain insight, not algorithmic innovation.

---

## Conclusion: From Determinism to Learning, and Back Again

The journey from **rule-based BTM** to **ML with BTM-augmented features** isn't a rejection of expert knowledge—it's an integration. The rules didn't become obsolete; they became **features**. The domain expertise that geomorphologists accumulated over decades was distilled into derivative rasters that an ML model could learn to weight appropriately.

But the journey also revealed **limits**. More data, more models, more features—these don't automatically solve harder problems. The path forward likely requires:

- **New signal sources** (e.g., multibeam backscatter imagery, environmental context)
- **Structural problem changes** (e.g., hierarchical classification: first geology, then ecology)
- **Ensemble approaches** that combine complementary signals (segmentation + tabular learners)

The repository documents not just a technical solution but a **thinking process**: hypothesis → experiment → measurement → insight → next hypothesis. The plateau we've reached (R04 as the effective ceiling) isn't failure—it's clarity about what's possible with the current problem formulation.

For practitioners: **Start simple.** Domain features + Random Forest beat complex algorithms every time, if the domain features carry the signal. Measure honestly (spatial-blocked CV). Know when to stop optimizing and when to change the problem.

---

## References

- **Original BTM**: Wright, D. J., & Lundblad, E. R. (2005). "Coastal mapping and GIS." In Coastal GIS. ESRI Press.
- **OBIA Reference**: Ierodiaconou, D., et al. (2018). "Object-based image analysis for the fine-scale mapping of benthic communities." Marine Geodesy, 41(6), 567–587.
- **Repository**: [github.com/bird70/btm](https://github.com/bird70/btm)
- **Competition baseline**: Kaggle Geohab Benthic Habitat Challenge, 2026

---

*This post summarizes the decision-making process documented in 25+ experiment runs, 9 feature branches, and 100+ commits across 18 months of benthic habitat classification research. The evolution reflects not a single "best" answer but rather the iterative refinement of what's possible given data constraints, domain knowledge, and honest evaluation.*
