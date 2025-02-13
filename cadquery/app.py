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
import tempfile

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
    "math": math,
    "__builtins__": {name: __builtins__[name] 
      for name in validator.allowed_builtins
      if name in __builtins__}
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
    code = request.json['code']
    result, error = execute(code)
    if error:
        return make_response(message=error, status=400)
    # get the CadQuery result
    model = result['result']
    # create and manage temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.stl', delete=True)
    # export model to an STL
    cq.exporters.export(model, temp_file.name)
    # send file and ensure cleanup
    response = send_file(
      temp_file.name,
      as_attachment=True,
      download_name='model.stl',
      mimetype='application/octet-stream')
    # register cleanup callback
    @response.call_on_close
    def cleanup():
      temp_file.close()
    return response
  except Exception as e:
      return make_response(message=str(e), status=500)
    
@app.route('/step', methods=['POST'])
def run_step():
  try:
    code = request.json['code']
    result, error = execute(code)
    if error:
        return make_response(message=error, status=400)
    # get the CadQuery result
    model = result['result']
    # create and manage temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.step', delete=True)
    # export model to STEP
    cq.exporters.export(model, temp_file.name)
    # send file and ensure cleanup
    response = send_file(
      temp_file.name,
      as_attachment=True,
      download_name='model.step',
      mimetype='application/octet-stream')
    # register cleanup callback
    @response.call_on_close
    def cleanup():
      temp_file.close()
    return response
  except Exception as e:
      return make_response(message=str(e), status=500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
