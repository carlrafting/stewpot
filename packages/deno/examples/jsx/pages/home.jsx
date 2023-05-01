import Nav from "../components/nav.jsx";

export const home = ({ date }) => (
  <>
    <Nav />
    <main>
      <h1>Current time</h1>
      <p>{date}</p>
    </main>
  </>
);
