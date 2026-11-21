CREATE DATABASE limpeza_do_Rego;
USE limpeza_do_Rego;

CREATE TABLE avaliacoes(
    id INT PRIMARY KEY AUTO_INCREMENT,
    professor VARCHAR(100) NOT NULL,
    sala VARCHAR(20) NOT NULL,
    pontuacao INT NOT NULL CHECK(pontuacao >= 0 AND pontuacao <=5),
    data_avaliacao DATE NOT NULL
);

INSERT INTO avaliacoes (professor,sala,pontuacao,data_avaliacao)
VALUES ('Dimas','3ºB','3','2026-01-16'),
       ('Geovana','2ºB','1','2026-01-16'),
       ('Rubens','3ºA','4','2026-01-16'),
       ('Wagner','1ºD','4','2026-01-16');

SELECT sala, SUM(pontuacao) AS total_pontos
FROM avaliacoes
WHERE data_avaliacao BETWEEN '2026-01-01' AND '2026-04-30'
GROUP BY sala
ORDER BY total_pontos DESC;


    