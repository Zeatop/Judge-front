pipeline {
    agent any

    environment {
        REGISTRY = '10.0.0.10:5000'
        IMAGE = 'judge-front'
        TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/Zeatop/Judge-front.git'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh """
                        docker run --rm \
                            --volumes-from jenkins \
                            -w /var/jenkins_home/workspace/Judge-front \
                            -e SONAR_HOST_URL=\$SONAR_HOST_URL \
                            -e SONAR_TOKEN=\$SONAR_AUTH_TOKEN \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=Judge-front \
                            -Dsonar.sources=src \
                            -Dsonar.host.url=\$SONAR_HOST_URL \
                            -Dsonar.token=\$SONAR_AUTH_TOKEN
                    """
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${REGISTRY}/${IMAGE}:${TAG} -t ${REGISTRY}/${IMAGE}:latest ."
            }
        }

        stage('Docker Push') {
            steps {
                sh "docker push ${REGISTRY}/${IMAGE}:${TAG}"
                sh "docker push ${REGISTRY}/${IMAGE}:latest"
            }
        }

        stage('Deploy to K8s') {
            steps {
                sh "sed -i 's|${REGISTRY}/${IMAGE}:latest|${REGISTRY}/${IMAGE}:${TAG}|' k8s/deployment.yaml"
                sh 'kubectl apply -f k8s/deployment.yaml'
                sh 'kubectl rollout status deployment/judge-front --timeout=120s'
            }
        }
    }

    post {
        success {
            echo "Déploiement réussi ! Judge-front accessible sur le port 30080"
        }
        failure {
            echo "Le pipeline a échoué"
        }
    }
}
