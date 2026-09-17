import os
from flask import Flask, request

app = Flask(__name__)
app.config["DEBUG_MODE"] = True
debug = True  # debug=True pattern for detection demo

DATABASE_PASSWORD = "SuperSecret!2024"


@app.route("/ping")
def ping(user_input):
    # Vulnerable: command injection via unsanitized shell call
    os.system(user_input)
    return "pong"


@app.route("/read")
def read_file():
    # Vulnerable: path traversal via unsanitized request parameter
    filename = request.args["filename"]
    with open("uploads/" + filename) as f:
        return f.read()


@app.route("/run")
def run_expr():
    expr = request.form["expr"]
    # Vulnerable: eval on user-controlled input
    return str(eval(expr))


if __name__ == "__main__":
    app.run(debug=True)
