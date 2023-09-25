import io
import sys
import contextlib
from fastapi import FastAPI, Request, HTTPException
from computations import compute

arg1 = sys.argv[1]
app = FastAPI()

@contextlib.contextmanager
def capture_output():
    old_stdout = sys.stdout

    class Tee(io.StringIO):
        def write(self, s):
            old_stdout.write(s)  # Write to the original stdout immediately.
            old_stdout.flush()   # Flush the stdout immediately.
            super().write(s)     # Capture the output.

    new_stdout = Tee()
    sys.stdout = new_stdout
    yield new_stdout
    sys.stdout = old_stdout


@app.post("/process")
async def process(request: Request):
    try:
        computed_output = {}
        inputs = await request.json()

        # Capture the output of the compute function.
        with capture_output() as buffer:
            computed_output = compute(**inputs)

        # Get the captured output.
        captured_string = buffer.getvalue()

        return computed_output, captured_string

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Port {arg1} Internal Server Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(arg1))
