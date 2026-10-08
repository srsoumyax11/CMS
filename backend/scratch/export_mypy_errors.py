import subprocess
import os

def export_mypy():
    res = subprocess.run([r".\venv\Scripts\mypy.exe", "app"], capture_output=True, text=True)
    lines = res.stdout.splitlines() + res.stderr.splitlines()
    
    formatted = []
    formatted.append("# MyPy Type Error & Warning Checklist\n")
    formatted.append("Total errors found by mypy analysis. Checkbox `[ ]` prefix added for tracking resolution.\n")
    
    for line in lines:
        if line.strip():
            if ": error:" in line or ": warning:" in line or ": note:" in line:
                formatted.append(f"- [ ] `{line.strip()}`")
            else:
                formatted.append(f"  {line.strip()}")
                
    output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mypy_errors_checklist.md"))
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(formatted))
        
    print(f"Exported {len(formatted)} formatted mypy output lines to {output_path}")

if __name__ == "__main__":
    export_mypy()
