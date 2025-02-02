# cadquery2web

You know when you want to generate a CadQuery STL file and print it at work, but you can't import CadQuery on your work laptop? Run it on your server at home and have a web based interface to view the model, and download the STL.

See a live instance at [cad.30hours.dev](http://cad.30hours.dev).

TODO picture of front-end

## Usage

- Run the containers using `docker-compose`:

  ```
  sudo docker compose up -d
  ```

- Navigate to [localhost:49157](http://localhost:49157) to start creating.

## Operation

The software consists of 3 containers:

- **web** runs the front-end. This is HTML/CSS/JavaScript that allows CadQuery code to be input, shows the current 3D model with [three.js](https://github.com/mrdoob/three.js/) and allows requesting an STL to be generated from the server and downloaded. 

  TODO explain more on the live 3D updates

- **node** runs a Node.js server to handle requests from the user (geometry and STL requests) and serve these back to the client. It implements a queue to process requests for simultaneous users.

- **cadquery** runs the CadQuery server in Python. The CadQuery server has security controls to ensure only CadQuery code can be executed, to prevent remote code execution and privilege escalation (see the [CadQuery Dockerfile](./cadquery/Dockerfile) and [docker-compose.yml](./docker-compose.yml) for details). Strict whitelisting on the imports and functions that can be executed has been implemented in [CadQueryValidator.py](./cadquery/CadQueryValidator.py).

  Once code passes the validator, TODO

## License

[MIT](https://choosealicense.com/licenses/mit/)
