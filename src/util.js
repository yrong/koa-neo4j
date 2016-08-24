/**
 * Created by keyvan on 8/22/16.
 */

function* key_values(obj) {
  for (const key of Object.keys(obj)) {
    yield [key, obj[key]];
  }
}

const have_intersection = (arrayFirst, arraySecond) => {
  if (!arrayFirst || !arraySecond)
    return false;
  const first = new Set(arrayFirst);
  const second = new Set(arraySecond);
  for (const element of first)
    if (second.has(element))
      return true;
  return false;
};

export {key_values, have_intersection};
