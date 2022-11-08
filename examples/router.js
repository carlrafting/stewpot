import stewpot from "stewpot";
import main from "../test/app/examples/router.js";

const directory = "test/app";

stewpot({
  directory,
  module: main,
});
