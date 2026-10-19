// Lets Jest import .html files as strings, mirroring the webpack asset/source rule.
module.exports = {
  process(source) {
    return { code: `module.exports = ${JSON.stringify(source)};` };
  },
};
