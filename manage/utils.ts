export const duration = (
  duration: Temporal.DurationLike,
  unit: Temporal.PluralizeUnit<Temporal.TimeUnit | Temporal.DateUnit> =
    "milliseconds",
) => Temporal.Duration.from(duration).total({ unit });
