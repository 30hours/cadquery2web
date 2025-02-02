"""
@file app.py
@brief Process CadQuery requests and send using Flask
@author 30hours
"""

from CadQueryValidator import CadQueryValidator
from Preview import preview

from flask import Flask, request, send_file
import cadquery as cq
import numpy as np
import math
import json

app = Flask(__name__)
validator = CadQueryValidator()

def execute(code):
  """
  @brief All remote code execution through this function
  """
  code = code
  cleaned_code, error = validator.validate(code)
  if error:
    return None, error
  # safe execute code
  globals_dict = {
      "cq": cq,
      "np": np,
      "math": math
  }
  locals_dict = {}
  exec(cleaned_code, globals_dict, locals_dict)
  return locals_dict, None

def make_response(data=None, message="Success", status=200):
  """
  @brief Generic function to send HTTP responses
  """
  return json.dumps({
    "data": data if data else "None",
    "message": message
  }), status

@app.route('/preview', methods=['POST'])
def run_preview():
  try:
    code = request.json['code']
    output, error = execute(code)
    if error:
      return make_response(message=error, status=400)
    # extract useful data
    mesh_data, error = preview(output['result'])
    if error:
      return make_response(message=error, status=400)
    return make_response(data=mesh_data, message="Preview generated successfully")
  except Exception as e:
      return make_response(message=str(e), status=500)

@app.route('/stl', methods=['POST'])
def run_stl():
  try:
    # append STL component to code
    # code = request.json['code'] + 'stl'
    code = request.json['code']
    result, error = execute(code)
    if error:
        return make_response(message=error, status=400)
    # TODO extract useful data
    return make_response(data="data", message="Preview generated successfully")
  except Exception as e:
      return make_response(message=str(e), status=500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
