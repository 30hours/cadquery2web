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

  """
  @class CadQueryValidator
  @brief Strict white-listing for imports and functions
  """

  def __init__(self):
    # explicitly define allowed import structure
    self.allowed_imports = {
      'cadquery': {'as': {'cq'}},  # only allow "import cadquery as cq"
      'math': {'functions': {
        'sin', 'cos', 'tan', 'pi', 'sqrt',
        'radians', 'degrees', 'atan2'
      }},  # only allow specific math functions
      'numpy': {
        'as': {'np'},  # only allow "import numpy as np"
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

    # Explicitly define allowed CadQuery operations
    self.allowed_cq_operations = {
      'Workplane', 'box', 'circle', 'cylinder', 'sphere',
      'extrude', 'revolve', 'union', 'cut', 'fillet',
      'chamfer', 'vertices', 'edges', 'faces', 'shell',
      'offset2D', 'offset', 'wire', 'rect', 'polygon',
      'polyline', 'spline', 'close', 'moveTo', 'lineTo',
      'line', 'vLineTo', 'hLineTo', 'mirrorY', 'mirrorX',
      'translate', 'rotate', 'size'
    }

    # Extremely limited set of allowed builtins
    self.allowed_builtins = {
      'float', 'int', 'bool', 'True', 'False', 'None'
    }

    self.errors = []

  def check_import(self, node: ast.AST) -> None:
    
      """
      @brief Validate imports against whitelist
      """
      
      if isinstance(node, ast.Import):
        for alias in node.names:
          if alias.name not in self.allowed_imports:
            self.errors.append(f"Import of '{alias.name}' is not allowed")
          elif alias.asname:
            if alias.name == 'cadquery' and alias.asname not in \
              self.allowed_imports['cadquery']['as']:
                self.errors.append(f"Must use 'import cadquery as cq'")
            elif alias.name == 'numpy' and alias.asname not in \
              self.allowed_imports['numpy']['as']:
                self.errors.append(f"Must use 'import numpy as np'")
      elif isinstance(node, ast.ImportFrom):
        if node.module not in self.allowed_imports:
          self.errors.append(
            f"Import from '{node.module}' is not allowed")
        else:
          for alias in node.names:
            if node.module == 'math':
              if alias.name not in self.allowed_imports['math']['functions']:
                self.errors.append(f"Import of math.{alias.name} is not allowed")

  def check_call(self, node: ast.Call) -> None:
    
    """
    @brief Validate function calls against whitelist
    """
    
    if isinstance(node.func, ast.Name):
      func_name = node.func.id
      if func_name not in self.allowed_builtins:
        self.errors.append(f"Function call to '{
          func_name}' is not allowed")
    elif isinstance(node.func, ast.Attribute):
      # only allow specific CadQuery operations
      if isinstance(node.func.value, ast.Name) and node.func.value.id == 'cq':
        if node.func.attr not in self.allowed_cq_operations:
          self.errors.append(f"CadQuery operation '{
            node.func.attr}' is not allowed")
      # allow specific math operations
      elif isinstance(node.func.value, ast.Name) and node.func.value.id == 'math':
        if node.func.attr not in self.allowed_imports['math']['functions']:
          self.errors.append(f"Math operation '{
            node.func.attr}' is not allowed")
      # allow specific numpy operations
      elif isinstance(node.func.value, ast.Name) and node.func.value.id == 'np':
        if node.func.attr not in self.allowed_imports['numpy']['functions']:
          self.errors.append(f"Numpy operation '{
            node.func.attr}' is not allowed")

  def visit_and_validate(self, node: ast.AST) -> None:
  
    """
    @brief Recursively visit and validate AST nodes
    """

    if isinstance(node, (ast.Import, ast.ImportFrom)):
      self.check_import(node)
    elif isinstance(node, ast.Call):
      self.check_call(node)
    # block all attribute access except explicitly allowed
    elif isinstance(node, ast.Attribute):
      if not (
        # allow CadQuery operations
        (isinstance(node.value, ast.Name) and
          node.value.id == 'cq' and
          node.attr in self.allowed_cq_operations) or
        # allow math functions
        (isinstance(node.value, ast.Name) and
          node.value.id == 'math' and
          node.attr in self.allowed_imports['math']['functions'])
      ):
        self.errors.append(f"Attribute access '{
          node.attr}' is not allowed")

    # block certain types of AST nodes entirely
    if isinstance(node, (ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda,
                          ast.GeneratorExp, ast.Await, ast.Yield, ast.YieldFrom,
                          ast.Global, ast.Nonlocal, ast.Try, ast.ExceptHandler)):
        self.errors.append(
            f"Usage of {node.__class__.__name__} is not allowed")

    # recursively check child nodes
    for child in ast.iter_child_nodes(node):
      self.visit_and_validate(child)

  def validate(self, code: str) -> Tuple[Optional[str], Optional[str]]:
    
    """
    @brief Validate CadQuery code and return (cleaned_code, error_message)
    If code is valid, error_message will be None
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
