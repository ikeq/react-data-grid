import { createRootRoute, Outlet } from '@tanstack/react-router';
import { css } from 'ecij';

import Nav from '../Nav';

export const Route = createRootRoute({
  component: Root
});

const mainClassname = css`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  block-size: 100vh;
  padding: 8px;
  contain: inline-size;
`;

function Root() {
  return (
    <>
      <Nav />
      <main className={mainClassname}>
        <Outlet />
      </main>
    </>
  );
}
