FROM nginx:alpine

# Removemos o arquivo de configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos o nosso arquivo nginx.conf personalizado para dentro da imagem
COPY nginx.conf /etc/nginx/nginx.conf

# A porta que vamos expor (definida no nginx.conf)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
