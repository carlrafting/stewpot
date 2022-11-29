import Nav from "../components/nav.jsx";

export const home = (
  <>
    <Nav />
    <main>
      <h1>Current time</h1>
      <p>{new Date().toLocaleString()}</p>
    </main>
  </>
);
