## Overview

_Diff_ and _deinit_ to *def*initely clean up resources. Compares two data structures and calls a destructor method on every inner object that's been "removed".

A small [subset](https://mitranim.com/espo/#-deinitdiff-prev-next-) of [Espo](https://mitranim.com/espo/), extracted as a separate library.

Useful for automatic cleanup when you store stuff in "immutable" structures, creating new versions instead of mutating them. Works well with ES2018 object spread or [Emerge](https://github.com/Mitranim/emerge).


## Why

Automatic resource cleanup: store and remove objects without worrying about forgetting to call destructors.


## Installation

```js
yarn add -E definit
# or
npm i -E definit
```


## Usage

### `deinitDiff(prev, next)`

Diffs `prev` and `next`, deiniting any objects that implement `isDeinitable` (see below) and exist in `prev` but not in `next`. The diff algorithm recursively traverses plain data structures, but stops at non-plain objects, allowing you to safely include objects of arbitrary size and structure.

Definition of “plain data”:

* primitive: number, string, boolean, symbol, `null`, `undefined`
* `{}` or `Object.create(null)`
* array

Everything else is considered non-data and is not traversed.

Resilient to exceptions: if a deiniter or a property accessor produces an exception, deinitDiff will still traverse the rest of the tree, delaying exceptions until the end.

Avoids cyclic references.

```js
class Resource {
  constructor (name) {this.name = name}
  deinit () {console.info('deiniting:', this.name)}
}

class BlackBox {
  constructor (inner) {this.inner = inner}
}

const prev = {
  root: new Resource('Sirius'),
  dict: {
    inner: new Resource('Arcturus'),
  },
  list: [new Resource('Rigel')],
  // Sun is untouchable to deinitDiff because it's wrapped
  // into a non-plain object that doesn't implement isDeinitable
  blackBox: new BlackBox(new Resource('Sun'))
}

const next = {
  root: prev.root,
  dict: {
    inner: new Resource('Bellatrix')
  },
  list: null,
}

deinitDiff(prev, next)

// 'deiniting: Arcturus'
// 'deiniting: Rigel'

deinitDiff(next, null)

// 'deiniting: Sirius'
// 'deiniting: Bellatrix'
```

### `deinitDeep(value)`

Same as `deinitDiff(value, undefined)`. Deeply deinits the entire outgoing value.

```js
const tree = {
  one: {deinit() {console.info('cleanup!')}},
  two: {deinit() {console.info('cleanup!')}},
}

deinitDeep(tree)
```

### `isDeinitable(value)`

True if `value` has a `.deinit` method.

```js
isDeinitable({deinit() {}})
// true

isDeinitable({})
// false
```


## State Container

`definit` is useful for adding automatic resource cleanup to a _state container_: a popular pattern for storing immutable data on a mutable reference. Redux is a popular example, but you don't actually need a library for this.

This state container is copied from my production apps:

```js
import {deinitDiff} from 'definit'

class Ptr {
  constructor(value) {
    this.$ = value
  }

  swap(fun) {
    const prev = arguments[0] = this.$
    deinitDiff(prev, this.$ = fun.apply(undefined, arguments))
  }

  reset(next) {
    deinitDiff(this.$, this.$ = next)
  }

  deinit() {
    deinitDiff(this.$, undefined)
  }
}
```

Usage:

```js
const env = new Ptr({})

const xhr = new XMLHttpRequest()
const request = {xhr, deinit() {xhr.abort()}}

env.swap(state => ({...state, request}))

env.$
// {request: {xhr, deinit}}

// Removing the request also aborts it
env.swap(state => ({...state, request: undefined}))

env.$
// {request: undefined}
```

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts
