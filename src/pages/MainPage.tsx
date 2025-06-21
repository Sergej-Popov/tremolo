import React, { useContext } from "react";

import GuitarBoard from "../components/GuitarBoard";
import { AppContext } from "../Store";

const MainPage: React.FC = () => {
  const app = useContext(AppContext);
  const boards = app?.boards ?? [0];

  return (
    <>
      {boards.map((id) => (
        <GuitarBoard key={id} />
      ))}
    </>
  );
};

export default MainPage;
