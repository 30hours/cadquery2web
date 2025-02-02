"""
@file CadQueryValidator.py
@brief Validate CadQuery input code
@description Strict white-listing for imports and functions
@author 30hours
"""

import ast
from typing import Optional, Tuple
import re

class CadQueryValidator:
  def __init__(self):
    # explicitly define allowed import structure
    self.allowed_imports = {
      'cadquery': {'as': {'cq'}},  # only allow "import cadquery as cq"
      'math': {'functions': {
        'sin', 'cos', 'tan', 'pi', 'sqrt',
        'radians', 'degrees', 'atan2'
      }},
      'numpy': {
        'as': {'np'},
        'functions': {
          # array creation and manipulation
          'array', 'zeros', 'ones', 'linspace', 'arange',
          # math operations
          'sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan', 'arctan2',
          'deg2rad', 'rad2deg', 'pi',
          'sqrt', 'square', 'power', 'exp', 'log', 'log10',
          # statistics
          'mean', 'median', 'std', 'min', 'max',
          # linear algebra
          'dot', 'cross', 'transpose',
          # rounding
          'floor', 'ceil', 'round',
          # array operations
          'concatenate', 'stack', 'reshape', 'flatten'
        }
      }
    }
    # expanded set of allowed CadQuery operations
    self.allowed_cq_operations = {
      # core operations
      'Workplane', 'box', 'circle', 'cylinder', 'sphere',
      'extrude', 'revolve', 'union', 'cut', 'fillet',
      'chamfer', 'vertices', 'edges', 'faces', 'shell',
      'offset2D', 'offset', 'wire', 'rect', 'polygon',
      'polyline', 'spline', 'close', 'moveTo', 'lineTo',
      'line', 'vLineTo', 'hLineTo', 'mirrorY', 'mirrorX',
      'translate', 'rotate', 'size',
      # additional 2D operations
      'center', 'radiusArc', 'threePointArc', 'ellipse',
      'ellipseArc', 'close', 'section', 'slot',
      # 3D operations
      'loft', 'sweep', 'twistExtrude', 'ruled',
      'wedge', 'cone', 'hull', 'mirror',
      # selection operations
      'all', 'size', 'item', 'itemAt', 'first', 'last',
      'end', 'vertices', 'faces', 'edges', 'wires', 'solids',
      'shells', 'compounds', 'vals', 'add', 'combine',
      # workplane operations
      'workplane', 'plane', 'plane', 'transformed',
      'center', 'pushPoints', 'cutBlind', 'cutThruAll',
      'close', 'toPending', 'workplaneFromTagged',
      # selector strings as attributes
      'tag', 'end', 'val', 'wire', 'solid', 'face',
      # direction selectors
      'rarray', 'polarArray', 'grid',
      # boolean operations
      'intersect', 'combine', 'each',
      # measurement and inspection
      'val', 'vals', 'dump',
      # string constants for plane selection
      'XY', 'YZ', 'XZ', 'front', 'back', 'left', 
      'right', 'top', 'bottom',
      # common string selectors
      '|Z', '>Z', '<Z', '|X', '>X', '<X', 
      '|Y', '>Y', '<Y', '#Z', '#X', '#Y'
    }
    # extremely limited set of allowed builtins
    self.allowed_builtins = {
      'float', 'int', 'bool', 'str', 'list', 'tuple',
      'True', 'False', 'None', 'range', 'len'
    }

    self.errors = []

  def check_import(self, node: ast.AST) -> None:
    """Validate imports against whitelist"""
    if isinstance(node, ast.Import):
      for alias in node.names:
        if alias.name not in self.allowed_imports:
          self.errors.append(f"Import of '{alias.name}' is not allowed")
        elif alias.asname:
          if alias.name == 'cadquery' and alias.asname not in self.allowed_imports['cadquery']['as']:
            self.errors.append(f"Must use 'import cadquery as cq'")
          elif alias.name == 'numpy' and alias.asname not in self.allowed_imports['numpy']['as']:
            self.errors.append(f"Must use 'import numpy as np'")
    elif isinstance(node, ast.ImportFrom):
      if node.module not in self.allowed_imports:
        self.errors.append(f"Import from '{node.module}' is not allowed")
      else:
        for alias in node.names:
          if node.module == 'math' and alias.name not in self.allowed_imports['math']['functions']:
            self.errors.append(f"Import of math.{alias.name} is not allowed")

  def check_call(self, node: ast.Call) -> None:
    """Validate function calls against whitelist"""
    if isinstance(node.func, ast.Name):
      func_name = node.func.id
      if func_name not in self.allowed_builtins:
        self.errors.append(f"Function call to '{func_name}' is not allowed")
    elif isinstance(node.func, ast.Attribute):
      # handle chained operations by recursively checking the value
      if isinstance(node.func.value, ast.Call):
        self.check_call(node.func.value)
      # get the base object (handling chains)
      base_obj = node.func.value
      while isinstance(base_obj, ast.Attribute):
        base_obj = base_obj.value
      # check if it's a CadQuery operation
      if isinstance(base_obj, ast.Name) and base_obj.id == 'cq':
        if node.func.attr not in self.allowed_cq_operations:
          self.errors.append(f"CadQuery operation '{node.func.attr}' is not allowed")
      # check math operations  
      elif isinstance(base_obj, ast.Name) and base_obj.id == 'math':
        if node.func.attr not in self.allowed_imports['math']['functions']:
          self.errors.append(f"Math operation '{node.func.attr}' is not allowed")
      # check numpy operations
      elif isinstance(base_obj, ast.Name) and base_obj.id == 'np':
        if node.func.attr not in self.allowed_imports['numpy']['functions']:
          self.errors.append(f"Numpy operation '{node.func.attr}' is not allowed")

  def is_valid_chain_member(self, node: ast.Attribute) -> bool:
    """
    @brief Check if an attribute is valid in a method chain
    """
    # get the base of the chain
    base_obj = node.value
    while isinstance(base_obj, ast.Attribute):
      base_obj = base_obj.value
    # valid if it's a CadQuery chain (starting with cq)
    if isinstance(base_obj, ast.Name) and base_obj.id == 'cq':
      return node.attr in self.allowed_cq_operations
    # valid if it's a result chain
    if isinstance(base_obj, ast.Name) and base_obj.id == 'result':
      return node.attr in self.allowed_cq_operations
    # valid if it's a math function
    if isinstance(base_obj, ast.Name) and base_obj.id == 'math':
      return node.attr in self.allowed_imports['math']['functions']
    # valid if it's a numpy function
    if isinstance(base_obj, ast.Name) and base_obj.id == 'np':
      return node.attr in self.allowed_imports['numpy']['functions']
    return False

  def visit_and_validate(self, node: ast.AST) -> None:
    """
    @brief Recursively visit and validate AST nodes
    """
    if isinstance(node, (ast.Import, ast.ImportFrom)):
      self.check_import(node)
    elif isinstance(node, ast.Call):
      self.check_call(node)
    elif isinstance(node, ast.Attribute):
      # handle method chains by checking if this is a valid chain member
      if not self.is_valid_chain_member(node):
        # only report error if this isn't part of a method call chain
        if not (isinstance(node.value, (ast.Call, ast.Attribute)) or
               (isinstance(node.value, ast.Name) and node.value.id == 'result')):
          self.errors.append(f"Attribute access '{node.attr}' is not allowed")
    # block certain types of AST nodes entirely
    if isinstance(node, (ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda,
                        ast.GeneratorExp, ast.Await, ast.Yield, ast.YieldFrom,
                        ast.Global, ast.Nonlocal, ast.Try, ast.ExceptHandler)):
      self.errors.append(f"Usage of {node.__class__.__name__} is not allowed")
    # recursively check child nodes
    for child in ast.iter_child_nodes(node):
      self.visit_and_validate(child)

  def validate(self, code: str) -> Tuple[Optional[str], Optional[str]]:
    """
    @brief Validate CadQuery code and return (cleaned_code, error_message)
    @description If code is valid, error_message will be None
    If code is invalid, cleaned_code will be None
    """
    self.errors = []
    # check for required result assignment
    if not re.search(r'result\s*=', code):
      return None, "Code must assign to 'result' variable"
    try:
      tree = ast.parse(code)
    except SyntaxError as e:
      return None, f"Invalid Python syntax: {str(e)}"
    # validate the AST
    self.visit_and_validate(tree)
    if self.errors:
      return None, "Validation failed: " + "; ".join(self.errors)
    return code, None
  