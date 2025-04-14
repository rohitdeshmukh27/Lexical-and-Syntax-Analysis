// Sample JSON Schema
const sampleSchema = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Product",
  "type": "object",
  "properties": {
    "id": {
      "type": "integer"
    },
    "name": {
      "type": "string"
    },
    "price": {
      "type": "number",
      "minimum": 0
    }
  },
  "required": ["id", "name", "price"]
}`;

// DOM elements
const jsonInput = document.getElementById("jsonInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const sampleBtn = document.getElementById("sampleBtn");
const clearBtn = document.getElementById("clearBtn");
const tokensOutput = document.getElementById("tokensOutput");
const astOutput = document.getElementById("astOutput");
const validationOutput = document.getElementById("validationOutput");

// Token types
const TokenType = {
  LEFT_BRACE: "LEFT_BRACE",
  RIGHT_BRACE: "RIGHT_BRACE",
  LEFT_BRACKET: "LEFT_BRACKET",
  RIGHT_BRACKET: "RIGHT_BRACKET",
  COLON: "COLON",
  COMMA: "COMMA",
  STRING: "STRING",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
  NULL: "NULL",
  KEYWORD: "KEYWORD",
  ERROR: "ERROR",
};

// JSON Schema keywords
const jsonSchemaKeywords = [
  "$schema",
  "title",
  "description",
  "type",
  "properties",
  "required",
  "minimum",
  "maximum",
  "minLength",
  "maxLength",
  "items",
  "additionalProperties",
  "definitions",
  "$ref",
];

// Button event listeners
sampleBtn.addEventListener("click", () => {
  jsonInput.value = sampleSchema;
  analyzeJSON();
});

clearBtn.addEventListener("click", () => {
  jsonInput.value = "";
  tokensOutput.textContent = "";
  astOutput.textContent = "";
  validationOutput.textContent = "";
});

analyzeBtn.addEventListener("click", analyzeJSON);

// Main analysis function
function analyzeJSON() {
  try {
    const input = jsonInput.value;

    // Run lexical analysis
    const tokens = lexicalAnalysis(input);
    displayTokens(tokens);

    // Run syntax analysis
    const ast = syntaxAnalysis(tokens);
    displayAST(ast);

    // Run validation
    const validationResults = validateSchema(ast);
    displayValidation(validationResults);
  } catch (error) {
    tokensOutput.textContent = "Error analyzing JSON: " + error.message;
    astOutput.textContent = "Error analyzing JSON: " + error.message;
    validationOutput.textContent = "Error analyzing JSON: " + error.message;
  }
}

// Lexical analysis function
function lexicalAnalysis(input) {
  const tokens = [];
  let position = 0;

  function isWhitespace(char) {
    return /\s/.test(char);
  }

  function isDigit(char) {
    return /[0-9]/.test(char);
  }

  function scanToken() {
    // Skip whitespace
    while (position < input.length && isWhitespace(input[position])) {
      position++;
    }

    if (position >= input.length) return null;

    const char = input[position];

    // Handle single-character tokens
    if (char === "{") {
      position++;
      return { type: TokenType.LEFT_BRACE, value: "{" };
    }
    if (char === "}") {
      position++;
      return { type: TokenType.RIGHT_BRACE, value: "}" };
    }
    if (char === "[") {
      position++;
      return { type: TokenType.LEFT_BRACKET, value: "[" };
    }
    if (char === "]") {
      position++;
      return { type: TokenType.RIGHT_BRACKET, value: "]" };
    }
    if (char === ":") {
      position++;
      return { type: TokenType.COLON, value: ":" };
    }
    if (char === ",") {
      position++;
      return { type: TokenType.COMMA, value: "," };
    }

    // Handle strings
    if (char === '"') {
      const start = position;
      position++; // Skip opening quote

      while (position < input.length && input[position] !== '"') {
        // Handle escaped characters
        if (input[position] === "\\") {
          position++; // Skip the escape character
        }
        position++;
      }

      if (position >= input.length) {
        return { type: TokenType.ERROR, value: "Unterminated string" };
      }

      position++; // Skip closing quote
      const value = input.substring(start, position);
      const content = value.slice(1, -1); // Remove quotes

      // Check if it's a JSON Schema keyword
      if (jsonSchemaKeywords.includes(content)) {
        return { type: TokenType.KEYWORD, value, content };
      }

      return { type: TokenType.STRING, value, content };
    }

    // Handle numbers
    if (isDigit(char) || char === "-") {
      const start = position;

      // Handle negative sign
      if (char === "-") {
        position++;
      }

      // Integer part
      while (position < input.length && isDigit(input[position])) {
        position++;
      }

      // Decimal part
      if (position < input.length && input[position] === ".") {
        position++;
        while (position < input.length && isDigit(input[position])) {
          position++;
        }
      }

      const value = input.substring(start, position);
      return { type: TokenType.NUMBER, value };
    }

    // Handle literals
    if (char === "t" && input.substr(position, 4) === "true") {
      position += 4;
      return { type: TokenType.BOOLEAN, value: "true" };
    }

    if (char === "f" && input.substr(position, 5) === "false") {
      position += 5;
      return { type: TokenType.BOOLEAN, value: "false" };
    }

    if (char === "n" && input.substr(position, 4) === "null") {
      position += 4;
      return { type: TokenType.NULL, value: "null" };
    }

    // Unrecognized token
    position++;
    return {
      type: TokenType.ERROR,
      value: `Unexpected character: ${char}`,
    };
  }

  // Scan all tokens
  let token = scanToken();
  while (token !== null) {
    tokens.push(token);
    token = scanToken();
  }

  return tokens;
}

// Syntax analysis (AST building)

// this funciton creates the nodes for all the code using the tokens
function syntaxAnalysis(tokens) {
  let current = 0;

  function peek() {
    if (current >= tokens.length) return null;
    return tokens[current];
  }

  function advance() {
    current++;
    return tokens[current - 1];
  }

  function parseValue() {
    const token = peek();

    if (!token) {
      return { type: "ERROR", message: "Unexpected end of input" };
    }

    switch (token.type) {
      case TokenType.LEFT_BRACE:
        return parseObject();
      case TokenType.LEFT_BRACKET:
        return parseArray();
      case TokenType.STRING:
        advance();
        return { type: "STRING", value: token.content };
      case TokenType.NUMBER:
        advance();
        return { type: "NUMBER", value: parseFloat(token.value) };
      case TokenType.BOOLEAN:
        advance();
        return { type: "BOOLEAN", value: token.value === "true" };
      case TokenType.NULL:
        advance();
        return { type: "NULL" };
      case TokenType.KEYWORD:
        advance();
        return { type: "KEYWORD", value: token.content };
      default:
        advance();
        return {
          type: "ERROR",
          message: `Unexpected token: ${token.type}`,
        };
    }
  }

  function parseObject() {
    const obj = { type: "OBJECT", properties: [] };

    advance(); // Skip left brace

    // Empty object
    if (peek() && peek().type === TokenType.RIGHT_BRACE) {
      advance();
      return obj;
    }

    while (true) {
      // Property name must be a string
      const nameToken = peek();

      if (
        !nameToken ||
        (nameToken.type !== TokenType.STRING &&
          nameToken.type !== TokenType.KEYWORD)
      ) {
        return {
          type: "ERROR",
          message: "Expected property name string",
        };
      }

      advance();

      // Must be followed by a colon
      const colonToken = peek();

      if (!colonToken || colonToken.type !== TokenType.COLON) {
        return {
          type: "ERROR",
          message: "Expected colon after property name",
        };
      }

      advance();

      // Parse the property value
      const value = parseValue();

      // Add property to object
      obj.properties.push({
        name: nameToken.content,
        value: value,
      });

      // Check for comma or end of object
      const nextToken = peek();

      if (!nextToken) {
        return {
          type: "ERROR",
          message: "Unexpected end of input in object",
        };
      }

      if (nextToken.type === TokenType.RIGHT_BRACE) {
        advance();
        break;
      }

      if (nextToken.type !== TokenType.COMMA) {
        return {
          type: "ERROR",
          message: "Expected comma or closing brace in object",
        };
      }

      advance(); // Skip comma
    }

    return obj;
  }

  function parseArray() {
    const arr = { type: "ARRAY", elements: [] };

    advance(); // Skip left bracket

    // Empty array
    if (peek() && peek().type === TokenType.RIGHT_BRACKET) {
      advance();
      return arr;
    }

    while (true) {
      // Parse array element
      const element = parseValue();
      arr.elements.push(element);

      // Check for comma or end of array
      const nextToken = peek();

      if (!nextToken) {
        return {
          type: "ERROR",
          message: "Unexpected end of input in array",
        };
      }

      if (nextToken.type === TokenType.RIGHT_BRACKET) {
        advance();
        break;
      }

      if (nextToken.type !== TokenType.COMMA) {
        return {
          type: "ERROR",
          message: "Expected comma or closing bracket in array",
        };
      }

      advance(); // Skip comma
    }

    return arr;
  }

  // Start parsing from the root
  return parseValue();
}

// Basic schema validation
function validateSchema(ast) {
  const validationMessages = [];

  function findProperty(obj, name) {
    if (obj.type !== "OBJECT") return null;

    for (const prop of obj.properties) {
      if (prop.name === name) {
        return prop.value;
      }
    }

    return null;
  }

  // Basic validation
  if (ast.type === "OBJECT") {
    // Check for type property
    const typeProperty = findProperty(ast, "type");
    if (!typeProperty) {
      validationMessages.push(
        'Warning: Schema object is missing "type" property'
      );
    }

    // Check required property format
    const required = findProperty(ast, "required");
    if (required && required.type !== "ARRAY") {
      validationMessages.push(
        'Error: The "required" property must be an array'
      );
    }

    // Check properties existence
    const properties = findProperty(ast, "properties");
    if (typeProperty && typeProperty.value === "object" && !properties) {
      validationMessages.push(
        'Warning: Object schema is missing "properties" property'
      );
    }

    // Basic checks on numeric constraints
    const minimum = findProperty(ast, "minimum");
    const maximum = findProperty(ast, "maximum");
    if (
      minimum &&
      maximum &&
      minimum.type === "NUMBER" &&
      maximum.type === "NUMBER" &&
      minimum.value > maximum.value
    ) {
      validationMessages.push(
        'Error: "minimum" value cannot be greater than "maximum"'
      );
    }
  } else {
    validationMessages.push("Error: Root element must be an object");
  }

  return validationMessages.length > 0
    ? validationMessages
    : ["Schema appears valid."];
}

// Display tokens in the UI
function displayTokens(tokens) {
  tokensOutput.innerHTML = "";

  tokens.forEach((token) => {
    const tokenElement = document.createElement("span");
    let cssClass = "";

    switch (token.type) {
      case TokenType.KEYWORD:
        cssClass = "keyword";
        break;
      case TokenType.STRING:
        cssClass = "string";
        break;
      case TokenType.NUMBER:
        cssClass = "number";
        break;
      case TokenType.BOOLEAN:
        cssClass = "boolean";
        break;
      case TokenType.NULL:
        cssClass = "null";
        break;
      case TokenType.LEFT_BRACE:
      case TokenType.RIGHT_BRACE:
      case TokenType.LEFT_BRACKET:
      case TokenType.RIGHT_BRACKET:
      case TokenType.COLON:
      case TokenType.COMMA:
        cssClass = "punctuation";
        break;
      case TokenType.ERROR:
        cssClass = "error";
        break;
    }

    tokenElement.classList.add("token", cssClass);
    tokenElement.textContent = `${token.type}: ${token.value}`;
    tokensOutput.appendChild(tokenElement);
  });
}

// Display AST in the UI
function displayAST(ast) {
  astOutput.textContent = JSON.stringify(ast, null, 2);
}

// Display validation results in the UI
function displayValidation(validationResults) {
  validationOutput.innerHTML = validationResults.join("<br>");
}

// Auto-load the sample on page load
window.addEventListener("load", () => {
  sampleBtn.click();
});
