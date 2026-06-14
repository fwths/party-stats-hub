const fs = require("fs");
let txt = fs.readFileSync("src/data/srd/classes.ts", "utf8");

const targetStr = `
          ],
          "6": [
            {
              name: "MINDLESS RAGE",`;

const fixStr = `      {
        id: "berserker",
        name: "Path of the Berserker",
        description:
          "Barbarians who follow the Path of the Berserker thrill in the chaos of battle, heedless of their own health or well-being.",
        featuresByLevel: {
          "3": [
            {
              name: "FRENZY",
              description:
                "You can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.",
              id: "frenzy",
              actionType: "Passive",
            },
          ],
          "6": [
            {
              name: "MINDLESS RAGE",`;

const newTxt = txt.replace(targetStr, fixStr);
fs.writeFileSync("src/data/srd/classes.ts", newTxt);
console.log("Fixed berserker opening.");
