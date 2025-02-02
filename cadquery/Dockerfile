# @file Dockerfile
# @brief Dockerfile for cadquery container
# @author 30hours

FROM ubuntu:24.10
WORKDIR /app
# prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
# install system dependencies and Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    libgl1 \
    libglx-mesa0 \
    && rm -rf /var/lib/apt/lists/*
# create and activate virtual environment
ENV VENV=/opt/venv
RUN python3 -m venv $VENV
ENV PATH="$VENV/bin:$PATH"
# install Python dependencies in the virtual environment
RUN pip install --no-cache-dir \
    cadquery \
    numpy \
    flask \
    gunicorn
EXPOSE 5000
# create cadquery user
RUN useradd -r -m -d /home/cadquery -s /bin/false cadquery \
&& chown -R cadquery:cadquery /home/cadquery /app
# copy files
COPY --chown=cadquery:cadquery app.py .
COPY --chown=cadquery:cadquery CadQueryValidator.py .
COPY --chown=cadquery:cadquery Preview.py .
# switch to non-root user cadquery
USER cadquery
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", \
  "--threads", "4", "--timeout", "30", "app:app"]