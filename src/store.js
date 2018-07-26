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

    // Add some default objects to hold our actions, mutations and getters
    this.actions = {};
    this.mutations = {};
    this.getters = {};

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

    if(params.hasOwnProperty('getters')) {
      this.getters = params.getters;
    }

    // Persist store state in local storage
    this.storeKey = params.hasOwnProperty('key') ? params.key : '_sapper_store_key_';

    if (process.browser) {
      this.on('state', ({ current }) => {
        window.localStorage.setItem(this.storeKey, JSON.stringify(current));
      })
    }
  }

  /**
   * Init store on client side with data from server side,
   * or from localStorage if already available
   * 
   * @param  {Object} data state data from server
   * @return {Store}
   */
  init (state = {}) {
    const json = window.localStorage.getItem(this.storeKey) || {};
    this.status = 'mutation'; // Suppress warning
    this.set({ ...state, ...JSON.parse(json) });
    return this;
  }

  /**
   * Override parent 'get' method to retrieve value by key directly
   * 
   * @param  {String} key
   * @param  {Array} ...args
   * @return {Mixed}
   * @memberof Store
   */
  get (key = null, ...args) {
    if (key) {
      return this.getters.hasOwnProperty(key) 
            ? this.getters[key].call(this, ...args)
            : super.get()[key];
    } 
    // Default Svelte behaviour
    return super.get();
  }

  /**
   * Override parent 'set' method to warn if trying to set state directly
   * and dispatch state change event for listeners
   * 
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

    // Dispatch mutation event for the components that are listening
    process.browser && window.dispatchEvent(new CustomEvent('mutation', { detail: mutationKey }));
    
    // Get a new version of the state by running the mutation and storing the result of it
    let newState = this.mutations[mutationKey](this._state, payload);
    
    // Merge the old and new together to create a new state and set it
    this.set({ ...Object.assign(this._state, newState) });

    return true;
  }
}
