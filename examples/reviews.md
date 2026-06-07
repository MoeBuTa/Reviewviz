# Example reviews (synthetic)

A tiny, made-up two-reviewer set used to demo the tool. Replace with your real reviews.

## Review 1

### Strengths

- The paper tackles an important and timely problem with a clean, well-motivated design.

### Weaknesses

- The evaluation omits the obvious baseline FooGuard and gives no reason for leaving it out.
- It is impossible to tell whether the gains come from the architecture or from the larger training set, because the two are changed together.
- One ablation removing the cache layer is needed to isolate its contribution.

### Detailed comments

1. What exactly does the term "bounded context" mean in Section 3?
2. Table 2 reports F1 but the text on page 6 says accuracy, so please make the wording consistent.

## Review 2

The paper is generally well written and the results look strong. My main concern is framing rather than substance.

The problem statement should be sharpened, because it is never said what counts as a failure in precise terms.

How were the thresholds 0.5 and 0.7 chosen?

The related work reads more as a list than an argument and should be tightened.
