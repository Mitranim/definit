export function isDeinitable(value) {
  return isComplex(value) && isFunction(value.deinit)
}

export function deinitDiff(prev, next) {
  deinitDiffAcyclic(prev, next, setNew())
}

export function deinitDeep(value) {
  deinitDiffAcyclic(value, undefined, setNew())
}

function deinitDiffAcyclic(prev, next, visitedRefs) {
  if (is(prev, next)) return

  if (isDeinitable(prev)) {
    prev.deinit()
    return
  }

  // Don't bother traversing non-plain structures.
  // This allows to safely include third party objects with unknown structure.
  if (!isArray(prev) && !isDict(prev)) return

  // This avoids cyclic references.
  if (setHas(visitedRefs, prev)) return

  setAdd(visitedRefs, prev)
  diffAndDeinit(prev, next, visitedRefs)
}

// Ugly code is inlined to create fewer stackframes. Depending on the data
// layout, these functions tend to recur pretty deeply. More stackframes are
// annoying when profiling or debugging.
function diffAndDeinit(prev, next, visitedRefs) {
  if (isArray(prev)) {
    const isNextArray = isArray(next)
    let error = undefined
    for (let i = 0; i < prev.length; i += 1) {
      const prevValue = prev[i]
      if (isNextArray && includes(next, prevValue)) continue
      const nextValue = isNextArray ? next[i] : undefined
      try {deinitDiffAcyclic(prev[i], nextValue, visitedRefs)}
      catch (err) {error = err}
    }
    if (error) throw error
    return
  }

  // Assume `isDict(prev)`.
  const isNextDict = isDict(next)
  let error = undefined
  for (const key in prev) {
    const nextValue = isNextDict ? next[key] : undefined
    try {deinitDiffAcyclic(prev[key], nextValue, visitedRefs)}
    catch (err) {error = err}
  }
  if (error) throw error
}

/*
Store visited refs in a set where possible, falling back on a list. For large
structures, a list becomes our bottleneck; a set is MUCH faster.
*/
let setNew = undefined
let setAdd = undefined
let setHas = undefined
if (typeof Set === 'function') {
  setNew = function setNew() {return new Set()}
  setAdd = function setAdd(set, val) {set.add(val)}
  setHas = function setHas(set, val) {return set.has(val)}
}
else {
  setNew = function setNew() {return []}
  setAdd = function setAdd(set, val) {set.push(val)}
  setHas = function setHas(set, val) {return includes(set, val)}
}

function includes(list, value) {
  for (let i = 0; i < list.length; i += 1) if (is(list[i], value)) return true
  return false
}

function is(one, other) {
  return one === other || (isNaN(one) && isNaN(other))
}

function isNaN(value) {
  return value !== value  // eslint-disable-line no-self-compare
}

function isComplex(value) {
  return isObject(value) || isFunction(value)
}

function isInstance(value, Class) {
  return isComplex(value) && value instanceof Class
}

function isFunction(value) {
  return typeof value === 'function'
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isDict(value) {
  if (!isObject(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

function isArray(value) {
  return isInstance(value, Array)
}
