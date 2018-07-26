# sapper-store

Sapper / Svelte state management using the well-known **actions & mutations pattern**

* works on client- and server side
* can handle asynchronous actions
* emits `stateChange` event which your app can hook into
* warns when trying to change state directly
* persists state in `localStorage`

#### [Try the demo](https://todo-oxllhqmwbb.now.sh)

## Install

`npm install sapper-store`

## Usage

Import the store in your Sapper (or) Svelte project like this:

Add a `/store` directory with the following files

````
/store
 - actions.js
 - getters.js
 - index.js
 - mutations.js
 - state.js
````
#### actions.js

Actions receive a `context` (store) and a `payload` param. Every **action** should **commit** the state change:

````javascript
export default {
  addItem(context, payload) {
    context.commit('ADD_ITEM', payload);
  },
  clearItem(context, payload) {
    context.commit('CLEAR_ITEM', payload);
  }
};
````
Actions may be asynchronous.

#### mutations.js

Mutations should basically do no more than update the store state with the given payload:

````javascript
export default {
  ADD_ITEM (state, payload) {
    state.items.push(payload);
    return state;
  },
  CLEAR_ITEM (state, payload) {
    state.items.splice(payload.index, 1);
    return state;
  }
};
````
#### state.js

The store can be given initial state data in the form of a plain object literal, like this:

````javascript
export default {
  items: [
    'I made this',
    'Another thing'
  ]
};
````
#### getters.js

Optional getters can be added to the store in the following format:

````javascript
export default {
  item (index = 0) {
    const { items } = this.get();
    return items[index];
  },
  itemCount () {
    // 'Old' Svelte syntax is supported:
    return this.get('items').length;  	
  }
};
````
Call them in your app like this: `this.store.get('item', 1)`


#### index.js

This file ties all the parts together into a new `Store` object to use in your app: 

````javascript
import Store from './store.js';
import actions from './actions.js';
import mutations from './mutations.js';
import getters from './getters.js';
import state from './state.js';

const key = 'my-store-key';

export default new Store({
  actions,
  mutations,
  getters,
  state,
  key
});
````

And then use it like so:

#### app/server.js

````javascript
import sirv from 'sirv';
import polka from 'polka';
import sapper from 'sapper';
import compression from 'compression';
import { manifest } from './manifest/server.js';
import store from '../store';

polka() 
  .use(
    compression({ threshold: 0 }),
    sirv('assets'),
    sapper({ 
      store: request => store,
      manifest
    })
  )
  .listen(process.env.PORT)
  .catch(err => {
    console.log('error', err);
  })
````

#### app/client.js

On the client side, call the `init` method with the server side **data**:

````javascript
import { init } from 'sapper/runtime.js';
import { manifest } from './manifest/client.js';
import store from '../store';

init({
  target: document.querySelector('#sapper'),
  store: data => store.init(data),
  manifest
});
````

If you do not need/want to use the server side state, just omit the `init(data)` call and the Store will be give the default state from `state.js`

#### Use in components

Now, in your app you can **dispatch actions** and/or **commit mutations** like this: 

````javascript
this.store.dispatch('addItem', value);

this.store.commit('CLEAR_ITEM', index);
````

--
### Credits

This package was inspired by https://css-tricks.com/build-a-state-management-system-with-vanilla-javascript/

**See also**

* https://sapper.svelte.technology/guide#state-management
* https://svelte.technology/guide#state-management
