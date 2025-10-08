export interface IAppState {
  userId: string;
  startDate: number;
  endDate: number;
}

// Generate a UUID for the user
const generateUserId = (): string => {
  // Check if we already have a user ID in localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('pomodoro_user_id');
    if (stored) return stored;
  }

  // Generate a new UUID
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // Store it in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('pomodoro_user_id', uuid);
  }

  return uuid;
};

export const initialState: IAppState = {
  userId: generateUserId(), // Generate a proper UUID for the user
  startDate: Math.floor(new Date().getTime() / 1000),
  endDate: Math.floor(new Date().getTime() / 1000),
};

export enum actionTypes {
  SET_USERID = "SET_USERID",
  SET_DATES = "SET_DATES",
}

type SET_USERID = {
  type: actionTypes.SET_USERID;
  payload: string;
};

type SET_DATES = {
  type: actionTypes.SET_DATES;
  payload: {
    startDate?: number;
    endDate?: number;
  };
};

export type IAction = SET_USERID | SET_DATES;

const reducer = (state = initialState, action: IAction): IAppState => {
  switch (action.type) {
    case actionTypes.SET_USERID:
      return {
        ...state,
        userId: action.payload,
      };
    case actionTypes.SET_DATES:
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

export default reducer;
