from flask import Flask,  request, jsonify

# {'process': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend', 'filename': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend/release/0.2.1/mac/ZetaForge.app/Contents/Resources/app.asar/dist-electron/main/index-CervRw2X.js', 'dirname': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend/release/0.2.1/mac/ZetaForge.app/Contents/Resources/app.asar/dist-electron/main', 'root': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend'}
# {'process': '/', 'filename': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend/release/0.2.1/mac/ZetaForge.app/Contents/Resources/app.asar/dist-electron/main/index-CervRw2X.js', 'dirname': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend/release/0.2.1/mac/ZetaForge.app/Contents/Resources/app.asar/dist-electron/main', 'root': '/Users/kaganrua/Desktop/zetaforge-github/zetaforge/frontend/release/0.2.1/mac/ZetaForge.app/Contents/Resources/app.asar'}
app = Flask(__name__)

@app.route('/postdata', methods=["POST"])
def hello():
    data = request.get_json()  # Get the JSON data sent in the request body
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Process the data (this example just echoes it back)
    response = {
        "received_data": data
    }
    print(data)
    print("CHECK ME")
    return jsonify(response)

@app.route('/ping', methods=["POST"])
def ping():
    print("I AM PINGED")
    return jsonify({"Message": "success"})

if __name__ == '__main__':
    app.run(debug=True)