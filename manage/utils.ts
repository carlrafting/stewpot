export const duration = (duration: Temporal.DurationLike) =>
  Temporal.Duration.from(duration).total({ unit: "milliseconds" });
