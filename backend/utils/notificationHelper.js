export function evaluateInventoryNotifications(medications, previousStats = {}) {
  const now = new Date();

  let expiredCount = 0;
  let expiringSoonCount = 0;

  medications.forEach((item) => {
    const expiry = new Date(item.expiryDate);

    if (expiry < now) {
      expiredCount++;
    } else {
      const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);

      if (diffDays <= 30) {
        expiringSoonCount++;
      }
    }
  });

  const prevExpired = previousStats.expiredCount || 0;

  const thresholdCrossed =
    prevExpired < 25 && expiredCount >= 25;

  return {
    expiredCount,
    expiringSoonCount,
    thresholdCrossed,
  };
}