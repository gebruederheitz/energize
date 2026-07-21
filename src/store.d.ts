export interface StoreType<StateType> {
    subscribe(callback: (state: StateType) => void): () => void;
}
