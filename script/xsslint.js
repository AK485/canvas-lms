var XSSLint    = require("xsslint");
var Linter     = require("xsslint/linter");
var globby     = require("gglobby").default;
var fs         = require("fs");

XSSLint.configure({
  "xssable.receiver.whitelist": ["formData"],
  "jqueryObject.identifier": [/^\$/],
  "jqueryObject.property":   [/^\$/],
  "safeString.identifier":   [/(_html|Html|View|Template)$/, "html", "id"],
  "safeString.function":     ["h", "htmlEscape", "template", /(Template|View|Dialog)$/],
  "safeString.property":     ["template", "id", "height", "width", /_id$/],
  "safeString.method":       ["$.raw", "template", /(Template|Html)$/, "toISOString", "friendlyDatetime", /^(date|(date)?time)String$/]
});

// treat I18n.t calls w/ wrappers as html-safe, since they are
var origIsSafeString = Linter.prototype.isSafeString;
Linter.prototype.isSafeString = function(node) {
  var result = origIsSafeString.call(this, node);
  if (result) return result;

  if (node.type !== "CallExpression") return false;
  var callee = node.callee;
  if (callee.type !== "MemberExpression") return false;
  if (callee.object.type !== "Identifier" || callee.object.name !== "I18n") return false;
  if (callee.property.type !== "Identifier" || callee.property.name !== "t" && callee.property.name !== "translate") return false;
  var lastArg = node.arguments[node.arguments.length - 1];
  if (lastArg.type !== "ObjectExpression") return false;
  var wrapperOption = lastArg.properties.filter(function(prop){
    return prop.key.name === "wrapper" || prop.key.name === "wrappers";
  });
  return (wrapperOption.length > 0)
}

process.chdir("public/javascripts");
var ignores = fs.readFileSync(".xssignore").toString().trim().split(/\r?\n|\r/);
var files = globby.select(["*.js"]).reject(ignores).files;
//var files = ["./script/test.js"];

files.forEach(function(file) {
  XSSLint.run(file);
});

