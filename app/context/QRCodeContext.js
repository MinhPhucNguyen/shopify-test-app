import { createContext, useContext, useReducer } from "react";

export const QRCodeContext = createContext();

const initialState = {
  searchQuery: "",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
};

export const QRCodeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <QRCodeContext.Provider value={{ state, dispatch }}>
      {children}
    </QRCodeContext.Provider>
  );
};

export const useQRCodeContext = () => {
  const context = useContext(QRCodeContext);
  return context;
};
