export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-EG", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch (_err) {
    console.log(_err);

    return "";
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount)
}
