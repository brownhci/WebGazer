#!/bin/bash

# downloads models into local_models if they don't already exist
# then replaces tensorflow online calls with local paths in the dist


FACEMESH_URL="https://tfhub.dev/mediapipe/tfjs-model/facemesh/1/default/1"
IRIS_URL="https://tfhub.dev/mediapipe/tfjs-model/iris/1/default/2"
BLAZEFACE_URL="https://tfhub.dev/tensorflow/tfjs-model/blazeface/1/default/1"

FACEMESH_LOCAL_PATH="./local_models/facemesh/"
IRIS_LOCAL_PATH="./local_models/iris/"
BLAZEFACE_LOCAL_PATH="./local_models/blazeface/"

if [ ! -d "./local_models" ]; then
    mkdir -p ./local_models
    mkdir -p ./local_models/facemesh
    mkdir -p ./local_models/iris
    mkdir -p ./local_models/blazeface

    curl -L -o ./local_models/facemesh.tar.gz \
        https://www.kaggle.com/api/v1/models/mediapipe/facemesh/tfJs/default/1/download
    tar -xzf ./local_models/facemesh.tar.gz -C $FACEMESH_LOCAL_PATH
    rm ./local_models/facemesh.tar.gz


    curl -L -o ./local_models/iris.tar.gz \
        https://www.kaggle.com/api/v1/models/mediapipe/iris/tfJs/default/2/download
    tar -xzf ./local_models/iris.tar.gz -C $IRIS_LOCAL_PATH
    rm ./local_models/iris.tar.gz

    curl -L -o ./local_models/blazeface.tar.gz \
        https://www.kaggle.com/api/v1/models/tensorflow/blazeface/tfJs/default/1/download
    tar -xzf ./local_models/blazeface.tar.gz -C $BLAZEFACE_LOCAL_PATH
    rm ./local_models/blazeface.tar.gz
fi

find ./dist/ -type f -exec sed -i \
    -e "s#$FACEMESH_URL#$FACEMESH_LOCAL_PATH#g" \
    -e "s#$IRIS_URL#$IRIS_LOCAL_PATH#g" \
    -e "s#$BLAZEFACE_URL#$BLAZEFACE_LOCAL_PATH#g" {} +

echo "localization finished"
