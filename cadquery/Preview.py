"""
@file preview.py 
@brief Generate preview mesh data from CadQuery objects
@author 30hours
"""

import cadquery as cq

def extract_solids(shape):
  """
  @brief Extract all solids from a shape
  """
  if isinstance(shape, cq.occ_impl.shapes.Solid):
    return [shape]
  elif isinstance(shape, cq.occ_impl.shapes.Compound):
    return [s for s in shape.Solids()]
  else:
    return []

def preview(result):
  """
  @brief Generate preview mesh data from a CadQuery Workplane object.
  @param result: CadQuery object
  @return dict: Contains vertices and faces for three.js
    'vertices': [x1,y1,z1,x2,y2,z2,...],
    'faces': [v1,v2,v3,v4,v5,v6,...],
    'objectCount': number of objects in workplane
  
  Generate fast preview mesh data from a CadQuery Workplane object.
  Uses coarse tessellation for instant preview like cq-editor.
  """
  all_vertices = []
  all_faces = []
  vertex_offset = 0
  solid_count = 0
  # process each object in the workplane
  for obj in result.objects:
    # extract all solids from the object
    solids = extract_solids(obj)
    for solid in solids:
      solid_count += 1
      # use coarse tessellation like cq-editor for instant preview
      mesh = solid.tessellate(1.0, 1.0)
      # extract vertices
      for vertex in mesh[0]:
        all_vertices.extend([vertex.x, vertex.y, vertex.z])
      # extract triangular faces
      for face in mesh[1]:
        all_faces.extend([v + vertex_offset for v in face])
      # update vertex offset for the next solid
      vertex_offset += len(mesh[0])
  if solid_count == 0:
    return None, "No solids found in workplane"
  output = {
    'vertices': all_vertices,
    'faces': all_faces,
    'objectCount': solid_count
  }
  return output, None