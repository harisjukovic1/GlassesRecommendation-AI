import { GLASSES, RECOMMENDATION_TABLE } from "../data/glassesCatalog";

function normalizeShape(shape) {
  if (!shape) return "";

  const lower = String(shape).toLowerCase();

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getSortedShapes(probabilitiesPercent) {
  if (!probabilitiesPercent) return [];

  return Object.entries(probabilitiesPercent)
    .map(([shape, value]) => ({
      shape: normalizeShape(shape),
      value: Number(value) || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function getRecommendations(probabilitiesPercent, fallbackFaceShape) {
  const sortedShapes = getSortedShapes(probabilitiesPercent);

  const dominantShape =
    sortedShapes[0]?.shape || normalizeShape(fallbackFaceShape);

  const secondaryShape = sortedShapes[1]?.shape || null;

  const tableEntry = RECOMMENDATION_TABLE[dominantShape];

  if (!tableEntry) {
    return {
      dominantShape,
      secondaryShape,
      profileLabel: "General recommendations",
      items: [],
    };
  }

  const pureItems = tableEntry.pure.map((slug) => ({
    ...GLASSES[slug],
    recommendationType: `Pure ${dominantShape}`,
    reason: `Recommended because your dominant face shape is ${dominantShape}.`,
  }));

  const comboSlug = secondaryShape
    ? tableEntry.combinations?.[secondaryShape]
    : null;

  const comboItem = comboSlug
    ? {
        ...GLASSES[comboSlug],
        recommendationType: `${dominantShape} + ${secondaryShape} Secondary`,
        reason: `Added because your secondary face-shape influence is ${secondaryShape}.`,
      }
    : null;

  const items = comboItem ? [...pureItems, comboItem] : pureItems;

  return {
    dominantShape,
    secondaryShape,
    profileLabel: comboItem
      ? `${dominantShape} dominant + ${secondaryShape} secondary`
      : `${dominantShape} dominant`,
    items,
  };
}