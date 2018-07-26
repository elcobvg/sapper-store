import { Store as BaseStore } from 'svelte/store.js';

const isDev = process.env.NODE_ENV === 'development' || false;

/**
 * Sapper / Svelte state management using common actions/mutations pattern
 * Based on https://github.com/hankchizljaw/vanilla-js-state-management
 */
export default class Store extends BaseStore {
  constructor(params) {

    // Call parent constructor
    process.browser ? super() : super(params.state);

    // Add some default objects to hold our actions, mutations and state
    this.actions = {};
    this.mutations = {};

    // A status enum to set during actions and mutations
    this.status = 'noop';

    // Look in the passed params object for actions and mutations 
    // that might have been passed in
    if(params.hasOwnProperty('actions')) {
      this.actions = params.actions;
    }
    
    if(params.hasOwnProperty('mutations')) {
      this.mutations = params.mutations;
    }

    // Persist store state in local storage
    const key = params.hasOwnProperty('key') ? params.key : '_sapper_store_key_';
    if (process.browser) {
      const json = window.localStorage.getItem(key);
      this.status = 'mutation'; // Suppress warning
      json && this.set(JSON.parse(json));

      this.on('state', ({ current }) => {
        window.localStorage.setItem(key, JSON.stringify(current));
      })
    }
  }

  /**
   * Init store on client side with data from server side
   * @param  {Object} data state data from server
   * @return {Store}
   */
  init (state = {}) {
    this.status = 'mutation'; // Suppress warning
    this.set({ ...state });
    return this;
  }

  /**
   * Override parent 'get' method to retrieve value by key directly
   * @param  {String} key
   * @return {Mixed}
   * @memberof Store
   */
  get (key = null) {
    return key ? super.get()[key] : super.get();
  }

  /**
   * Override parent 'set' method to warn if trying to set state directly
   * @param {Object} newState
   * @memberof Store
   */
  set (newState) {
    // Give the user a little telling off if they set a value directly
    if(this.status !== 'mutation') {
      isDev && console.warn(`Don't set state directly, you should use a mutation instead`);
    }

    // Set the value as we would normally
    super.set(newState);
    
    // Trace out to the console. This will be grouped by the related action
    isDev && console.log('stateChange:', { ...newState });

    // Dispatch state change event for the components that are listening
    process.browser && window.dispatchEvent(new CustomEvent('stateChange', { detail: newState }));

    // Reset the status ready for the next operation
    this.status = 'noop';
  }

  /**
   * A dispatcher for actions that looks in the actions 
   * collection and runs the action if it can find it
   *
   * @param {String} actionKey
   * @param {Mixed} payload
   * @returns {Boolean}
   * @memberof Store
   */
  dispatch(actionKey, payload) {
      
    // Run a quick check to see if the action actually exists
    // before we try to run it
    if(typeof this.actions[actionKey] !== 'function') {
      console.error(`Action "${actionKey} doesn't exist.`);
      return false;
    }
    
    // Create a console group which will contain the logs from our action and mutation
    isDev && console.groupCollapsed(`ACTION: ${actionKey}`);
    
    // Let anything that's watching the status know that we're dispatching an action
    this.status = 'action';
    
    // Actually call the action and pass it the Store context and whatever payload was passed
    this.actions[actionKey](this, payload);
    
    // Close our console group to keep things nice and neat
    isDev && console.groupEnd();

    return true;
  }

  /**
   * Look for a mutation and modify the state object 
   * if that mutation exists by calling it
   *
   * @param {String} mutationKey
   * @param {Mixed} payload
   * @returns {Boolean}
   * @memberof Store
   */
  commit(mutationKey, payload) {
    
    // Run a quick check to see if this mutation actually exists
    // before trying to run it
    if(typeof this.mutations[mutationKey] !== 'function') {
      console.log(`Mutation "${mutationKey}" doesn't exist`);
      return false;
    }
    
    // Let anything that's watching the status know that we're mutating state
    this.status = 'mutation';

    isDev && console.log(`MUTATION ${mutationKey}:`, payload);
    
    // Get a new version of the state by running the mutation and storing the result of it
    let newState = this.mutations[mutationKey](this._state, payload);
    
    // Merge the old and new together to create a new state and set it
    this.set({ ...Object.assign(this._state, newState) });

    return true;
  }
}
